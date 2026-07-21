const { sha256, stableJson } = require('./security');

async function appendAudit(client, { organizationId, entityType, entityId, action, actorUserId = null, detail = {} }) {
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`audit:${organizationId}`]);
  const prior = await client.query('SELECT hash FROM audit_events WHERE organization_id=$1 ORDER BY sequence DESC LIMIT 1 FOR UPDATE', [organizationId]);
  const previousHash = prior.rows[0]?.hash || 'GENESIS';
  const material = stableJson({ organizationId, entityType, entityId: String(entityId), action, actorUserId, detail, previousHash });
  const hash = sha256(material);
  const result = await client.query(
    `INSERT INTO audit_events(organization_id,entity_type,entity_id,action,actor_user_id,detail,previous_hash,hash)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [organizationId, entityType, String(entityId), action, actorUserId, detail, previousHash, hash],
  );
  return result.rows[0];
}

async function verifyAudit(pool, organizationId) {
  const result = await pool.query('SELECT * FROM audit_events WHERE organization_id=$1 ORDER BY sequence', [organizationId]);
  let previousHash = 'GENESIS';
  for (const event of result.rows) {
    const material = stableJson({ organizationId, entityType: event.entity_type, entityId: event.entity_id, action: event.action, actorUserId: event.actor_user_id, detail: event.detail, previousHash });
    if (event.previous_hash !== previousHash || event.hash !== sha256(material)) return { valid: false, checked: result.rowCount, brokenSequence: String(event.sequence) };
    previousHash = event.hash;
  }
  return { valid: true, checked: result.rowCount, head: previousHash };
}

module.exports = { appendAudit, verifyAudit };
