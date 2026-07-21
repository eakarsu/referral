const { assertPublicHost } = require('./security');
const { appendAudit } = require('./audit');

async function boundedText(response) {
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > 65_536) throw new Error('Provider response exceeded 64 KiB');
  return buffer.toString('utf8');
}

async function deliver(connection, operation, transport = fetch, skipDns = false) {
  const url = new URL(connection.base_url);
  if (!skipDns) await assertPublicHost(url.hostname);
  const token = process.env[connection.token_env];
  if (!token) throw new Error(`Credential ${connection.token_env} is missing`);
  const response = await transport(new URL('/v1/operations', url), {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'idempotency-key': operation.idempotency_key },
    body: JSON.stringify({ kind: operation.kind, payload: operation.payload }),
  });
  const text = await boundedText(response);
  if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
  let payload = {};
  if (text) { try { payload = JSON.parse(text); } catch { throw new Error('Provider returned invalid JSON'); } }
  return { externalId: payload.id ? String(payload.id) : null };
}

async function runOperations(pool, { organizationId, limit = 25, transport = fetch, skipDns = false }) {
  const summary = { claimed: 0, succeeded: 0, retried: 0, deadLettered: 0 };
  const candidates = await pool.query(
    `SELECT o.*, row_to_json(p) AS provider FROM outbox_operations o JOIN provider_connections p ON p.id=o.provider_connection_id
     WHERE o.organization_id=$1 AND o.status IN ('PENDING','RETRY') AND o.next_attempt_at<=now() ORDER BY o.created_at LIMIT $2`,
    [organizationId, Math.min(Number(limit) || 25, 100)],
  );
  for (const candidate of candidates.rows) {
    const claim = await pool.query(`UPDATE outbox_operations SET status='PROCESSING',attempts=attempts+1,updated_at=now() WHERE id=$1 AND status IN ('PENDING','RETRY') RETURNING *`, [candidate.id]);
    if (!claim.rowCount) continue;
    summary.claimed += 1;
    try {
      const response = await deliver(candidate.provider, candidate, transport, skipDns);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`UPDATE outbox_operations SET status='SUCCEEDED',external_id=$2,last_error=NULL,updated_at=now() WHERE id=$1`, [candidate.id, response.externalId]);
        if (candidate.idempotency_key.startsWith('crm:handoff:')) await client.query(`UPDATE handoffs SET status='ACCEPTED',last_error=NULL,updated_at=now() WHERE id=$1`, [candidate.idempotency_key.slice('crm:handoff:'.length)]);
        if (candidate.kind === 'EMAIL_SEND') await client.query(`UPDATE outreach_deliveries SET status='SENT',provider_message_id=$2,sent_at=now(),attempts=attempts+1,updated_at=now() WHERE idempotency_key=$1`, [candidate.idempotency_key, response.externalId]);
        await appendAudit(client, { organizationId: candidate.organization_id, entityType: 'OutboxOperation', entityId: candidate.id, action: 'PROVIDER_SUCCEEDED', detail: { kind: candidate.kind, provider: candidate.provider.name, externalId: response.externalId } });
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
      summary.succeeded += 1;
    } catch (error) {
      const attempts = candidate.attempts + 1;
      const terminal = attempts >= 3;
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `UPDATE outbox_operations SET status=$2,last_error=$3,next_attempt_at=now()+($4::text||' milliseconds')::interval,updated_at=now() WHERE id=$1`,
          [candidate.id, terminal ? 'DEAD_LETTER' : 'RETRY', String(error.message).slice(0, 500), Math.min(60_000 * (2 ** attempts), 3_600_000)],
        );
        if (terminal && candidate.kind === 'EMAIL_SEND') await client.query(`UPDATE outreach_deliveries SET status='FAILED',last_error=$2,attempts=attempts+1,updated_at=now() WHERE idempotency_key=$1`, [candidate.idempotency_key, String(error.message).slice(0, 500)]);
        if (terminal && candidate.idempotency_key.startsWith('crm:handoff:')) await client.query(`UPDATE handoffs SET status='RETRY_REQUIRED',last_error=$2,updated_at=now() WHERE id=$1`, [candidate.idempotency_key.slice('crm:handoff:'.length), String(error.message).slice(0, 500)]);
        await appendAudit(client, { organizationId: candidate.organization_id, entityType: 'OutboxOperation', entityId: candidate.id, action: terminal ? 'PROVIDER_DEAD_LETTER' : 'PROVIDER_RETRY_SCHEDULED', detail: { kind: candidate.kind, provider: candidate.provider.name, attempts, error: String(error.message).slice(0, 500) } });
        await client.query('COMMIT');
      } catch (writeError) { await client.query('ROLLBACK'); throw writeError; }
      finally { client.release(); }
      if (terminal) summary.deadLettered += 1; else summary.retried += 1;
    }
  }
  return summary;
}

module.exports = { boundedText, deliver, runOperations };
