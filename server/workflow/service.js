const { appendAudit } = require('./audit');
const { assertTransition, normalizeEmail, normalizeName, parseSourceTime, problem, requiredText, sha256, stableJson, validEmail } = require('./security');

async function inTransaction(pool, work, isolation = 'SERIALIZABLE') {
  const client = await pool.connect();
  try {
    await client.query(`BEGIN ISOLATION LEVEL ${isolation}`);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function activeProvider(client, organizationId, type) {
  const result = await client.query('SELECT * FROM provider_connections WHERE organization_id=$1 AND type=$2 AND active=true ORDER BY created_at LIMIT 1', [organizationId, type]);
  return result.rows[0] || null;
}

async function queueOperation(client, { organizationId, provider, leadId, kind, payload, idempotencyKey }) {
  if (!provider) return null;
  const result = await client.query(
    `INSERT INTO outbox_operations(organization_id,provider_connection_id,lead_id,kind,payload,idempotency_key)
     VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key RETURNING *`,
    [organizationId, provider.id, leadId, kind, payload, idempotencyKey],
  );
  return result.rows[0];
}

async function createLead(pool, actor, input) {
  const email = normalizeEmail(input.email);
  if (!validEmail(email)) throw problem('A valid email is required');
  const region = input.privacyRegion;
  if (!['US_CAN_SPAM', 'EU_GDPR', 'CA_CCPA'].includes(region)) throw problem('A supported privacyRegion is required');
  return inTransaction(pool, async (client) => {
    let accountId = null;
    if (input.accountName) {
      const name = requiredText(input.accountName, 'accountName');
      const account = await client.query(
        `INSERT INTO accounts(organization_id,name,normalized_name,privacy_region) VALUES($1,$2,$3,$4)
         ON CONFLICT(organization_id,normalized_name) DO UPDATE SET name=EXCLUDED.name,version=accounts.version+1,updated_at=now() RETURNING id`,
        [actor.organizationId, name, normalizeName(name), region],
      );
      accountId = account.rows[0].id;
    }
    let lead;
    try {
      const result = await client.query(
        `INSERT INTO leads(organization_id,account_id,first_name,last_name,email,normalized_email,phone,privacy_region,attribution)
         VALUES($1,$2,$3,$4,$5,$5,$6,$7,$8) RETURNING *`,
        [actor.organizationId, accountId, requiredText(input.firstName, 'firstName', 100), requiredText(input.lastName, 'lastName', 100), email, input.phone || null, region, { source: requiredText(input.source, 'source', 100), campaign: input.campaign || null, createdBy: actor.id }],
      );
      lead = result.rows[0];
    } catch (error) {
      if (error.code === '23505') throw problem('A lead with this email already exists', 409);
      throw error;
    }
    const crm = await activeProvider(client, actor.organizationId, 'CRM');
    await queueOperation(client, { organizationId: actor.organizationId, provider: crm, leadId: lead.id, kind: 'CRM_UPSERT', payload: { leadId: lead.id, email, lifecycle: lead.lifecycle, attribution: lead.attribution }, idempotencyKey: `crm:create:${lead.id}` });
    await appendAudit(client, { organizationId: actor.organizationId, entityType: 'Lead', entityId: lead.id, action: 'CREATED', actorUserId: actor.id, detail: { source: input.source, accountId } });
    return lead;
  });
}

async function applyWebhook(pool, connection, envelope) {
  const eventId = requiredText(envelope.id, 'event id', 200);
  const eventType = requiredText(envelope.type, 'event type', 100);
  const sourceTime = parseSourceTime(envelope.sourceOccurredAt);
  const payload = envelope.data || {};
  const payloadHash = sha256(stableJson(payload));
  return inTransaction(pool, async (client) => {
    const inserted = await client.query(
      `INSERT INTO sync_events(organization_id,provider_connection_id,external_event_id,event_type,direction,payload_hash,payload,source_occurred_at)
       VALUES($1,$2,$3,$4,'INBOUND',$5,$6,$7) ON CONFLICT(provider_connection_id,external_event_id) DO NOTHING RETURNING id`,
      [connection.organization_id, connection.id, eventId, eventType, payloadHash, payload, sourceTime],
    );
    if (!inserted.rowCount) {
      const prior = await client.query('SELECT id,payload_hash,status FROM sync_events WHERE provider_connection_id=$1 AND external_event_id=$2', [connection.id, eventId]);
      if (prior.rows[0].payload_hash !== payloadHash) throw problem('Event ID was reused with different content', 409);
      return { replay: true, syncEventId: prior.rows[0].id, status: prior.rows[0].status };
    }
    const syncEventId = inserted.rows[0].id;
    let result;
    if (eventType === 'lead.upsert') result = await inboundLead(client, connection, payload, sourceTime, eventId);
    else if (eventType === 'enrichment.updated') result = await inboundEnrichment(client, connection, payload, sourceTime);
    else if (eventType === 'consent.updated') result = await inboundConsent(client, connection, payload, sourceTime, eventId);
    else if (eventType === 'suppression.created') result = await inboundSuppression(client, connection, payload, sourceTime);
    else if (eventType === 'email.delivery') result = await inboundDelivery(client, connection, payload, sourceTime);
    else throw problem(`Unsupported event type ${eventType}`, 422);
    await client.query(`UPDATE sync_events SET status=$2,error=$3,processed_at=now() WHERE id=$1`, [syncEventId, result.quarantined ? 'QUARANTINED' : 'APPLIED', result.error || null]);
    await appendAudit(client, { organizationId: connection.organization_id, entityType: 'SyncEvent', entityId: syncEventId, action: result.quarantined ? 'QUARANTINED' : 'APPLIED', detail: { eventId, eventType, result } });
    return { replay: false, syncEventId, ...result };
  });
}

async function inboundLead(client, connection, payload, sourceTime, eventId) {
  if (connection.type !== 'CRM') throw problem('lead.upsert requires a CRM connection', 422);
  const email = normalizeEmail(payload.email);
  if (!validEmail(email)) throw problem('A valid email is required');
  if (!['US_CAN_SPAM', 'EU_GDPR', 'CA_CCPA'].includes(payload.privacyRegion)) throw problem('A supported privacyRegion is required');
  const existing = await client.query('SELECT * FROM leads WHERE organization_id=$1 AND normalized_email=$2 FOR UPDATE', [connection.organization_id, email]);
  if (existing.rowCount && existing.rows[0].source_updated_at && existing.rows[0].source_updated_at > sourceTime) {
    return { leadId: existing.rows[0].id, quarantined: true, error: 'Stale CRM update requires human resolution' };
  }
  let accountId = null;
  if (payload.accountName) {
    const name = requiredText(payload.accountName, 'accountName');
    const account = await client.query(
      `INSERT INTO accounts(organization_id,name,normalized_name,privacy_region) VALUES($1,$2,$3,$4)
       ON CONFLICT(organization_id,normalized_name) DO UPDATE SET name=EXCLUDED.name,privacy_region=EXCLUDED.privacy_region,version=accounts.version+1,updated_at=now() RETURNING id`,
      [connection.organization_id, name, normalizeName(name), payload.privacyRegion],
    );
    accountId = account.rows[0].id;
  }
  let lead;
  const attribution = { source: connection.name, campaign: payload.campaign || null, firstTouchEventId: eventId };
  if (existing.rowCount) {
    const updated = await client.query(
      `UPDATE leads SET account_id=COALESCE($2,account_id),first_name=$3,last_name=$4,email=$5,phone=$6,privacy_region=$7,
       external_crm_id=$8,source_updated_at=$9,version=version+1,updated_at=now() WHERE id=$1 RETURNING *`,
      [existing.rows[0].id, accountId, requiredText(payload.firstName, 'firstName', 100), requiredText(payload.lastName, 'lastName', 100), email, payload.phone || null, payload.privacyRegion, payload.externalId || null, sourceTime],
    );
    lead = updated.rows[0];
  } else {
    const created = await client.query(
      `INSERT INTO leads(organization_id,account_id,first_name,last_name,email,normalized_email,phone,privacy_region,external_crm_id,attribution,source_updated_at)
       VALUES($1,$2,$3,$4,$5,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [connection.organization_id, accountId, requiredText(payload.firstName, 'firstName', 100), requiredText(payload.lastName, 'lastName', 100), email, payload.phone || null, payload.privacyRegion, payload.externalId || null, attribution, sourceTime],
    );
    lead = created.rows[0];
  }
  const enrichment = await activeProvider(client, connection.organization_id, 'ENRICHMENT');
  await queueOperation(client, { organizationId: connection.organization_id, provider: enrichment, leadId: lead.id, kind: 'ENRICHMENT_REQUEST', payload: { leadId: lead.id, email }, idempotencyKey: `enrichment:${lead.id}:${lead.version}` });
  return { leadId: lead.id, accountId, deduplicated: Boolean(existing.rowCount) };
}

async function inboundEnrichment(client, connection, payload, sourceTime) {
  if (connection.type !== 'ENRICHMENT') throw problem('enrichment.updated requires an ENRICHMENT connection', 422);
  const email = normalizeEmail(payload.email);
  const lead = await client.query('SELECT * FROM leads WHERE organization_id=$1 AND normalized_email=$2 FOR UPDATE', [connection.organization_id, email]);
  if (!lead.rowCount) throw problem('Enrichment event does not match a lead', 422);
  const provenance = { ...(lead.rows[0].attribution || {}), enrichment: { provider: connection.name, sourceOccurredAt: sourceTime.toISOString() } };
  await client.query('UPDATE leads SET phone=COALESCE(phone,$2),attribution=$3,version=version+1,updated_at=now() WHERE id=$1', [lead.rows[0].id, payload.phone || null, provenance]);
  return { leadId: lead.rows[0].id, enriched: true };
}

async function inboundConsent(client, connection, payload, sourceTime, eventId) {
  if (connection.type !== 'CONSENT') throw problem('consent.updated requires a CONSENT connection', 422);
  if (!['GRANTED', 'REVOKED'].includes(payload.status)) throw problem('Consent status must be GRANTED or REVOKED');
  const lead = await client.query('SELECT * FROM leads WHERE organization_id=$1 AND normalized_email=$2 FOR UPDATE', [connection.organization_id, normalizeEmail(payload.email)]);
  if (!lead.rowCount) throw problem('Consent event does not match a lead', 422);
  const latest = await client.query('SELECT captured_at FROM consent_records WHERE lead_id=$1 ORDER BY captured_at DESC LIMIT 1', [lead.rows[0].id]);
  if (latest.rowCount && latest.rows[0].captured_at > sourceTime) return { leadId: lead.rows[0].id, quarantined: true, error: 'Stale consent event requires human resolution' };
  await client.query(
    `INSERT INTO consent_records(organization_id,lead_id,status,source,purpose,evidence,captured_at,revoked_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [connection.organization_id, lead.rows[0].id, payload.status, requiredText(payload.source, 'source', 100), requiredText(payload.purpose, 'purpose'), payload.evidence || { eventId }, sourceTime, payload.status === 'REVOKED' ? sourceTime : null],
  );
  await client.query('UPDATE leads SET consent_status=$2,version=version+1,updated_at=now() WHERE id=$1', [lead.rows[0].id, payload.status]);
  if (payload.status === 'REVOKED') await suppress(client, connection.organization_id, lead.rows[0], 'CONSENT_REVOKED', 'consent-provider', sourceTime);
  return { leadId: lead.rows[0].id, consentStatus: payload.status };
}

async function suppress(client, organizationId, lead, reason, source, sourceTime) {
  await client.query(
    `INSERT INTO suppressions(organization_id,normalized_email,reason,source,occurred_at) VALUES($1,$2,$3,$4,$5)
     ON CONFLICT(organization_id,normalized_email) DO UPDATE SET reason=EXCLUDED.reason,source=EXCLUDED.source,occurred_at=EXCLUDED.occurred_at`,
    [organizationId, lead.normalized_email, reason, source, sourceTime],
  );
  await client.query(`UPDATE outbox_operations SET status='CANCELLED',last_error=$3,updated_at=now() WHERE organization_id=$1 AND lead_id=$2 AND kind='EMAIL_SEND' AND status IN ('PENDING','RETRY')`, [organizationId, lead.id, `Cancelled: ${reason}`]);
  await client.query(`UPDATE outreach_deliveries SET status='OPTED_OUT',last_error=$3,updated_at=now() WHERE organization_id=$1 AND lead_id=$2 AND status='QUEUED'`, [organizationId, lead.id, reason]);
}

async function inboundSuppression(client, connection, payload, sourceTime) {
  if (connection.type !== 'SUPPRESSION') throw problem('suppression.created requires a SUPPRESSION connection', 422);
  const email = normalizeEmail(payload.email);
  if (!validEmail(email)) throw problem('A valid email is required');
  const lead = await client.query('SELECT * FROM leads WHERE organization_id=$1 AND normalized_email=$2 FOR UPDATE', [connection.organization_id, email]);
  const reason = requiredText(payload.reason, 'reason', 100);
  if (lead.rowCount) await suppress(client, connection.organization_id, lead.rows[0], reason, 'suppression-provider', sourceTime);
  else await client.query(`INSERT INTO suppressions(organization_id,normalized_email,reason,source,occurred_at) VALUES($1,$2,$3,'suppression-provider',$4) ON CONFLICT(organization_id,normalized_email) DO UPDATE SET reason=EXCLUDED.reason,occurred_at=EXCLUDED.occurred_at`, [connection.organization_id, email, reason, sourceTime]);
  return { leadId: lead.rows[0]?.id || null, suppressed: true };
}

async function inboundDelivery(client, connection, payload, sourceTime) {
  if (connection.type !== 'EMAIL') throw problem('email.delivery requires an EMAIL connection', 422);
  if (!['DELIVERED', 'BOUNCED', 'COMPLAINED', 'OPTED_OUT'].includes(payload.status)) throw problem('Unsupported delivery status');
  const delivery = await client.query('SELECT d.*,l.normalized_email,l.consent_status FROM outreach_deliveries d JOIN leads l ON l.id=d.lead_id WHERE d.organization_id=$1 AND d.provider_message_id=$2 FOR UPDATE', [connection.organization_id, String(payload.messageId || '')]);
  if (!delivery.rowCount) throw problem('Delivery event does not match a message', 422);
  await client.query(`UPDATE outreach_deliveries SET status=$2,delivered_at=CASE WHEN $2='DELIVERED' THEN $3 ELSE delivered_at END,updated_at=now() WHERE id=$1`, [delivery.rows[0].id, payload.status, sourceTime]);
  if (['BOUNCED', 'COMPLAINED', 'OPTED_OUT'].includes(payload.status)) {
    await suppress(client, connection.organization_id, { id: delivery.rows[0].lead_id, normalized_email: delivery.rows[0].normalized_email }, payload.status, 'email-provider', sourceTime);
    if (payload.status === 'OPTED_OUT') await client.query(`UPDATE leads SET consent_status='REVOKED',version=version+1,updated_at=now() WHERE id=$1`, [delivery.rows[0].lead_id]);
  }
  return { leadId: delivery.rows[0].lead_id, deliveryId: delivery.rows[0].id, deliveryStatus: payload.status };
}

async function recordConsent(pool, actor, leadId, input) {
  if (!['GRANTED','REVOKED'].includes(input.status)) throw problem('Consent status must be GRANTED or REVOKED');
  if (!input.evidence || typeof input.evidence !== 'object' || Array.isArray(input.evidence) || !Object.keys(input.evidence).length) throw problem('Structured consent evidence is required');
  return inTransaction(pool, async (client) => {
    const lead = await client.query('SELECT * FROM leads WHERE id=$1 AND organization_id=$2 FOR UPDATE', [leadId, actor.organizationId]);
    if (!lead.rowCount) throw problem('Lead not found', 404);
    const capturedAt = new Date();
    const record = await client.query(
      `INSERT INTO consent_records(organization_id,lead_id,status,source,purpose,evidence,captured_at,revoked_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [actor.organizationId, leadId, input.status, requiredText(input.source, 'source', 100), requiredText(input.purpose, 'purpose'), input.evidence || {}, capturedAt, input.status === 'REVOKED' ? capturedAt : null],
    );
    await client.query('UPDATE leads SET consent_status=$2,version=version+1,updated_at=now() WHERE id=$1', [leadId, input.status]);
    const consentProvider = await activeProvider(client, actor.organizationId, 'CONSENT');
    await queueOperation(client, { organizationId: actor.organizationId, provider: consentProvider, leadId, kind: 'CONSENT_EXPORT', payload: { leadId, email: lead.rows[0].email, status: input.status, source: input.source, purpose: input.purpose, capturedAt: capturedAt.toISOString(), evidence: input.evidence || {} }, idempotencyKey: `consent:${record.rows[0].id}` });
    if (input.status === 'REVOKED') {
      await suppress(client, actor.organizationId, lead.rows[0], 'CONSENT_REVOKED', 'local-operator', capturedAt);
      const suppressionProvider = await activeProvider(client, actor.organizationId, 'SUPPRESSION');
      await queueOperation(client, { organizationId: actor.organizationId, provider: suppressionProvider, leadId, kind: 'SUPPRESSION_EXPORT', payload: { email: lead.rows[0].email, reason: 'CONSENT_REVOKED', occurredAt: capturedAt.toISOString() }, idempotencyKey: `suppression:consent:${record.rows[0].id}` });
    }
    await appendAudit(client, { organizationId: actor.organizationId, entityType: 'ConsentRecord', entityId: record.rows[0].id, action: input.status, actorUserId: actor.id, detail: { leadId, source: input.source, purpose: input.purpose } });
    return record.rows[0];
  });
}

async function addSuppression(pool, actor, leadId, input) {
  return inTransaction(pool, async (client) => {
    const lead = await client.query('SELECT * FROM leads WHERE id=$1 AND organization_id=$2 FOR UPDATE', [leadId, actor.organizationId]);
    if (!lead.rowCount) throw problem('Lead not found', 404);
    const reason = requiredText(input.reason, 'reason', 100);
    const occurredAt = new Date();
    await suppress(client, actor.organizationId, lead.rows[0], reason, 'local-operator', occurredAt);
    const provider = await activeProvider(client, actor.organizationId, 'SUPPRESSION');
    await queueOperation(client, { organizationId: actor.organizationId, provider, leadId, kind: 'SUPPRESSION_EXPORT', payload: { email: lead.rows[0].email, reason, occurredAt: occurredAt.toISOString() }, idempotencyKey: `suppression:local:${leadId}:${occurredAt.getTime()}` });
    await appendAudit(client, { organizationId: actor.organizationId, entityType: 'Suppression', entityId: lead.rows[0].normalized_email, action: 'CREATED', actorUserId: actor.id, detail: { leadId, reason } });
    return { leadId, normalizedEmail: lead.rows[0].normalized_email, reason, occurredAt };
  });
}

async function requestHandoff(pool, actor, leadId, input) {
  return inTransaction(pool, async (client) => {
    const lead = await client.query('SELECT * FROM leads WHERE id=$1 AND organization_id=$2 FOR UPDATE', [leadId, actor.organizationId]);
    if (!lead.rowCount) throw problem('Lead not found', 404);
    if (actor.role === 'AGENT' && lead.rows[0].owner_user_id !== actor.id) throw problem('Only the owner may request a handoff', 403);
    const target = await client.query(`SELECT id FROM users WHERE id=$1 AND organization_id=$2 AND role IN ('AGENT','MANAGER') AND active=true`, [input.toUserId, actor.organizationId]);
    if (!target.rowCount) throw problem('Target owner is unavailable', 409);
    if (lead.rows[0].owner_user_id === input.toUserId) throw problem('Target already owns the lead', 409);
    const result = await client.query(
      `INSERT INTO handoffs(organization_id,lead_id,from_user_id,to_user_id,requested_by_id,reason) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [actor.organizationId, leadId, lead.rows[0].owner_user_id, input.toUserId, actor.id, requiredText(input.reason, 'reason', 500)],
    );
    await appendAudit(client, { organizationId: actor.organizationId, entityType: 'Handoff', entityId: result.rows[0].id, action: 'REQUESTED', actorUserId: actor.id, detail: { leadId, toUserId: input.toUserId } });
    return result.rows[0];
  });
}

async function reviewHandoff(pool, actor, handoffId, decision, reason) {
  return inTransaction(pool, async (client) => {
    const found = await client.query('SELECT * FROM handoffs WHERE id=$1 AND organization_id=$2 FOR UPDATE', [handoffId, actor.organizationId]);
    if (!found.rowCount) throw problem('Handoff not found', 404);
    const handoff = found.rows[0];
    if (handoff.status !== 'REQUESTED') throw problem('Only requested handoffs can be reviewed', 409);
    if (handoff.requested_by_id === actor.id) throw problem('Requester cannot approve their own handoff', 409);
    if (handoff.to_user_id === actor.id) throw problem('Target owner cannot approve their own handoff', 409);
    const status = decision === 'approve' ? 'APPROVED' : 'REJECTED';
    const result = await client.query('UPDATE handoffs SET status=$2,approved_by_id=$3,last_error=$4,updated_at=now() WHERE id=$1 RETURNING *', [handoffId, status, actor.id, status === 'REJECTED' ? requiredText(reason, 'reason', 500) : null]);
    await appendAudit(client, { organizationId: actor.organizationId, entityType: 'Handoff', entityId: handoffId, action: status, actorUserId: actor.id, detail: { reason: reason || null } });
    return result.rows[0];
  });
}

async function acceptHandoff(pool, actor, handoffId) {
  return inTransaction(pool, async (client) => {
    const found = await client.query('SELECT * FROM handoffs WHERE id=$1 AND organization_id=$2 FOR UPDATE', [handoffId, actor.organizationId]);
    if (!found.rowCount) throw problem('Handoff not found', 404);
    const handoff = found.rows[0];
    if (handoff.status !== 'APPROVED') throw problem('Handoff is not approved', 409);
    if (handoff.to_user_id !== actor.id) throw problem('Only the target owner may accept', 403);
    const currentLead = await client.query(`SELECT * FROM leads WHERE id=$1 AND organization_id=$2 FOR UPDATE`, [handoff.lead_id, actor.organizationId]);
    if (!currentLead.rowCount || currentLead.rows[0].owner_user_id !== handoff.from_user_id) {
      const retry = await client.query(`UPDATE handoffs SET status='RETRY_REQUIRED',last_error='Lead ownership changed while approval was pending',updated_at=now() WHERE id=$1 RETURNING *`, [handoffId]);
      await appendAudit(client, { organizationId: actor.organizationId, entityType: 'Handoff', entityId: handoffId, action: 'RETRY_REQUIRED', actorUserId: actor.id, detail: { reason: 'Lead ownership changed while approval was pending' } });
      return retry.rows[0];
    }
    const nextLifecycle = currentLead.rows[0].lifecycle === 'NEW' ? 'ASSIGNED' : currentLead.rows[0].lifecycle;
    const lead = await client.query(`UPDATE leads SET owner_user_id=$2,lifecycle=$3,version=version+1,updated_at=now() WHERE id=$1 RETURNING *`, [handoff.lead_id, actor.id, nextLifecycle]);
    if (currentLead.rows[0].lifecycle === 'NEW') await client.query(`INSERT INTO lifecycle_events(organization_id,lead_id,from_lifecycle,to_lifecycle,actor_user_id,reason) VALUES($1,$2,'NEW','ASSIGNED',$3,$4)`, [actor.organizationId, handoff.lead_id, actor.id, 'Approved ownership accepted']);
    if (lead.rows[0].account_id) await client.query(`UPDATE accounts SET owner_user_id=$2,lifecycle='ACTIVE',version=version+1,updated_at=now() WHERE id=$1`, [lead.rows[0].account_id, actor.id]);
    const result = await client.query(`UPDATE handoffs SET status='ACCEPTED',accepted_by_id=$2,updated_at=now() WHERE id=$1 RETURNING *`, [handoffId, actor.id]);
    const crm = await activeProvider(client, actor.organizationId, 'CRM');
    await queueOperation(client, { organizationId: actor.organizationId, provider: crm, leadId: handoff.lead_id, kind: 'CRM_UPSERT', payload: { leadId: handoff.lead_id, ownerUserId: actor.id, lifecycle: nextLifecycle, version: lead.rows[0].version }, idempotencyKey: `crm:handoff:${handoffId}` });
    await appendAudit(client, { organizationId: actor.organizationId, entityType: 'Handoff', entityId: handoffId, action: 'ACCEPTED', actorUserId: actor.id, detail: { leadId: handoff.lead_id, ownerUserId: actor.id, lifecycle: nextLifecycle } });
    return result.rows[0];
  });
}

async function transitionLead(pool, actor, leadId, input) {
  return inTransaction(pool, async (client) => {
    const found = await client.query('SELECT * FROM leads WHERE id=$1 AND organization_id=$2 FOR UPDATE', [leadId, actor.organizationId]);
    if (!found.rowCount) throw problem('Lead not found', 404);
    const lead = found.rows[0];
    if (actor.role === 'AGENT' && lead.owner_user_id !== actor.id) throw problem('Only the owner may move this lead', 403);
    if (Number(input.expectedVersion) !== lead.version) throw problem('Lead changed; refresh before retrying', 409);
    assertTransition(lead.lifecycle, input.lifecycle);
    if (input.lifecycle === 'QUALIFIED' && !lead.owner_user_id) throw problem('Lead must have an accepted owner', 409);
    const updated = await client.query('UPDATE leads SET lifecycle=$2,version=version+1,updated_at=now() WHERE id=$1 RETURNING *', [leadId, input.lifecycle]);
    await client.query('INSERT INTO lifecycle_events(organization_id,lead_id,from_lifecycle,to_lifecycle,actor_user_id,reason) VALUES($1,$2,$3,$4,$5,$6)', [actor.organizationId, leadId, lead.lifecycle, input.lifecycle, actor.id, requiredText(input.reason, 'reason', 500)]);
    if (input.lifecycle === 'CONVERTED' && lead.account_id) await client.query(`UPDATE accounts SET lifecycle='CUSTOMER',version=version+1,updated_at=now() WHERE id=$1`, [lead.account_id]);
    const crm = await activeProvider(client, actor.organizationId, 'CRM');
    await queueOperation(client, { organizationId: actor.organizationId, provider: crm, leadId, kind: 'CRM_UPSERT', payload: { leadId, lifecycle: input.lifecycle, version: updated.rows[0].version }, idempotencyKey: `crm:lifecycle:${leadId}:${updated.rows[0].version}` });
    await appendAudit(client, { organizationId: actor.organizationId, entityType: 'Lead', entityId: leadId, action: 'LIFECYCLE_TRANSITION', actorUserId: actor.id, detail: { from: lead.lifecycle, to: input.lifecycle, version: updated.rows[0].version } });
    return updated.rows[0];
  });
}

async function createDraft(pool, actor, leadId, input) {
  return inTransaction(pool, async (client) => {
    const lead = await client.query('SELECT * FROM leads WHERE id=$1 AND organization_id=$2', [leadId, actor.organizationId]);
    if (!lead.rowCount) throw problem('Lead not found', 404);
    if (actor.role === 'AGENT' && lead.rows[0].owner_user_id !== actor.id) throw problem('Only the owner may draft outreach', 403);
    if (!['QUALIFIED','OUTREACH_READY'].includes(lead.rows[0].lifecycle)) throw problem('Lead must be qualified before outreach', 409);
    const calendarAt = input.calendarAt ? new Date(input.calendarAt) : null;
    if (calendarAt && (Number.isNaN(calendarAt.getTime()) || calendarAt <= new Date())) throw problem('calendarAt must be in the future');
    const result = await client.query(
      `INSERT INTO outreach_drafts(organization_id,lead_id,requester_user_id,subject,body,calendar_at) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [actor.organizationId, leadId, actor.id, requiredText(input.subject, 'subject'), requiredText(input.body, 'body', 5000), calendarAt],
    );
    await appendAudit(client, { organizationId: actor.organizationId, entityType: 'OutreachDraft', entityId: result.rows[0].id, action: 'SUBMITTED_FOR_REVIEW', actorUserId: actor.id, detail: { leadId } });
    return result.rows[0];
  });
}

async function reviewDraft(pool, actor, draftId, decision, reason) {
  return inTransaction(pool, async (client) => {
    const found = await client.query(`SELECT d.*,l.email,l.normalized_email,l.lifecycle,l.consent_status,l.privacy_region,l.owner_user_id FROM outreach_drafts d JOIN leads l ON l.id=d.lead_id WHERE d.id=$1 AND d.organization_id=$2 FOR UPDATE`, [draftId, actor.organizationId]);
    if (!found.rowCount) throw problem('Draft not found', 404);
    const draft = found.rows[0];
    if (draft.status !== 'PENDING_REVIEW') throw problem('Draft is not awaiting review', 409);
    if (draft.requester_user_id === actor.id) throw problem('Requester cannot review their own outreach', 409);
    if (decision === 'reject') {
      const result = await client.query(`UPDATE outreach_drafts SET status='REJECTED',reviewer_user_id=$2,review_reason=$3,updated_at=now() WHERE id=$1 RETURNING *`, [draftId, actor.id, requiredText(reason, 'reason', 500)]);
      await appendAudit(client, { organizationId: actor.organizationId, entityType: 'OutreachDraft', entityId: draftId, action: 'REJECTED', actorUserId: actor.id, detail: { reason } });
      return result.rows[0];
    }
    if (draft.consent_status !== 'GRANTED') throw problem('Current email consent is required', 409);
    if (!validEmail(draft.normalized_email)) throw problem('Lead email is not deliverable', 409);
    if ((await client.query('SELECT 1 FROM suppressions WHERE organization_id=$1 AND normalized_email=$2', [actor.organizationId, draft.normalized_email])).rowCount) throw problem('Lead is suppressed', 409);
    const limits = await client.query(
      `SELECT count(*) FILTER (WHERE d.lead_id=$2) AS recipient_count,
       count(*) FILTER (WHERE l.owner_user_id=$3) AS owner_count
       FROM outreach_deliveries d JOIN leads l ON l.id=d.lead_id
       WHERE d.organization_id=$1 AND d.created_at>=now()-interval '24 hours' AND d.status IN ('QUEUED','SENT','DELIVERED')`,
      [actor.organizationId, draft.lead_id, draft.owner_user_id],
    );
    if (Number(limits.rows[0].recipient_count) >= Number(process.env.OUTREACH_RECIPIENT_DAILY_LIMIT || 1) || Number(limits.rows[0].owner_count) >= Number(process.env.OUTREACH_AGENT_DAILY_LIMIT || 100)) throw problem('Outreach daily rate limit reached', 429);
    const postal = process.env.ORGANIZATION_POSTAL_ADDRESS;
    if (!postal) throw problem('ORGANIZATION_POSTAL_ADDRESS is required before approval', 503);
    const email = await activeProvider(client, actor.organizationId, 'EMAIL');
    if (!email) throw problem('No active email provider is configured', 409);
    const calendar = draft.calendar_at ? await activeProvider(client, actor.organizationId, 'CALENDAR') : null;
    if (draft.calendar_at && !calendar) throw problem('No active calendar provider is configured', 409);
    const approved = await client.query(`UPDATE outreach_drafts SET status='APPROVED',reviewer_user_id=$2,review_reason=$3,approved_at=now(),updated_at=now() WHERE id=$1 RETURNING *`, [draftId, actor.id, reason || null]);
    const key = `email:${draftId}`;
    await client.query(`INSERT INTO outreach_deliveries(organization_id,outreach_draft_id,lead_id,idempotency_key) VALUES($1,$2,$3,$4)`, [actor.organizationId, draftId, draft.lead_id, key]);
    await queueOperation(client, { organizationId: actor.organizationId, provider: email, leadId: draft.lead_id, kind: 'EMAIL_SEND', payload: { to: draft.email, subject: draft.subject, body: `${draft.body}\n\n${postal}\nUnsubscribe: {{unsubscribe_url}}`, draftId }, idempotencyKey: key });
    if (calendar) await queueOperation(client, { organizationId: actor.organizationId, provider: calendar, leadId: draft.lead_id, kind: 'CALENDAR_CREATE', payload: { attendee: draft.email, startsAt: draft.calendar_at.toISOString(), subject: draft.subject, draftId }, idempotencyKey: `calendar:${draftId}` });
    if (draft.lifecycle === 'QUALIFIED') {
      const leadUpdate = await client.query(`UPDATE leads SET lifecycle='OUTREACH_READY',version=version+1,updated_at=now() WHERE id=$1 RETURNING version`, [draft.lead_id]);
      await client.query(`INSERT INTO lifecycle_events(organization_id,lead_id,from_lifecycle,to_lifecycle,actor_user_id,reason) VALUES($1,$2,'QUALIFIED','OUTREACH_READY',$3,$4)`, [actor.organizationId, draft.lead_id, actor.id, 'Approved outreach queued']);
      const crm = await activeProvider(client, actor.organizationId, 'CRM');
      await queueOperation(client, { organizationId: actor.organizationId, provider: crm, leadId: draft.lead_id, kind: 'CRM_UPSERT', payload: { leadId: draft.lead_id, lifecycle: 'OUTREACH_READY', version: leadUpdate.rows[0].version }, idempotencyKey: `crm:lifecycle:${draft.lead_id}:${leadUpdate.rows[0].version}` });
    }
    await appendAudit(client, { organizationId: actor.organizationId, entityType: 'OutreachDraft', entityId: draftId, action: 'APPROVED_AND_QUEUED', actorUserId: actor.id, detail: { emailProvider: email.name, calendarQueued: Boolean(calendar) } });
    return approved.rows[0];
  });
}

async function metrics(pool, organizationId) {
  const [leads, delivery, quality] = await Promise.all([
    pool.query('SELECT lifecycle,count(*)::int AS count FROM leads WHERE organization_id=$1 GROUP BY lifecycle', [organizationId]),
    pool.query('SELECT status,count(*)::int AS count FROM outreach_deliveries WHERE organization_id=$1 GROUP BY status', [organizationId]),
    pool.query(`SELECT count(*)::int AS total,
      count(*) FILTER(WHERE owner_user_id IS NULL)::int AS missing_owner,
      count(*) FILTER(WHERE consent_status<>'GRANTED')::int AS missing_consent
      FROM leads WHERE organization_id=$1`, [organizationId]),
  ]);
  const quarantined = await pool.query(`SELECT count(*)::int AS count FROM sync_events WHERE organization_id=$1 AND status='QUARANTINED'`, [organizationId]);
  const suppressed = await pool.query('SELECT count(*)::int AS count FROM suppressions WHERE organization_id=$1', [organizationId]);
  const lifecycle = Object.fromEntries(leads.rows.map(({ lifecycle, count }) => [lifecycle, count]));
  const deliveries = Object.fromEntries(delivery.rows.map(({ status, count }) => [status, count]));
  const total = quality.rows[0].total;
  return { generatedAt: new Date().toISOString(), totalLeads: total, lifecycle, deliveries, conversionRate: total ? Number(((lifecycle.CONVERTED || 0) / total).toFixed(4)) : 0, dataQuality: { missingOwner: quality.rows[0].missing_owner, missingConsent: quality.rows[0].missing_consent, suppressed: suppressed.rows[0].count, syncQuarantined: quarantined.rows[0].count } };
}

async function journey(pool, actor, leadId) {
  const lead = await pool.query(`SELECT l.*,a.name AS account_name,u.name AS owner_name FROM leads l LEFT JOIN accounts a ON a.id=l.account_id LEFT JOIN users u ON u.id=l.owner_user_id WHERE l.id=$1 AND l.organization_id=$2`, [leadId, actor.organizationId]);
  if (!lead.rowCount) throw problem('Lead not found', 404);
  if (actor.role === 'AGENT' && lead.rows[0].owner_user_id !== actor.id) throw problem('Lead is owned by another agent', 403);
  const [consents, lifecycle, handoffs, drafts, operations] = await Promise.all([
    pool.query('SELECT * FROM consent_records WHERE lead_id=$1 ORDER BY captured_at', [leadId]),
    pool.query('SELECT * FROM lifecycle_events WHERE lead_id=$1 ORDER BY created_at', [leadId]),
    pool.query('SELECT * FROM handoffs WHERE lead_id=$1 ORDER BY created_at', [leadId]),
    pool.query(`SELECT d.*,COALESCE(json_agg(v ORDER BY v.created_at) FILTER(WHERE v.id IS NOT NULL),'[]') AS deliveries FROM outreach_drafts d LEFT JOIN outreach_deliveries v ON v.outreach_draft_id=d.id WHERE d.lead_id=$1 GROUP BY d.id ORDER BY d.created_at`, [leadId]),
    pool.query('SELECT * FROM outbox_operations WHERE lead_id=$1 ORDER BY created_at', [leadId]),
  ]);
  return { lead: lead.rows[0], consents: consents.rows, lifecycleEvents: lifecycle.rows, handoffs: handoffs.rows, outreach: drafts.rows, operations: operations.rows };
}

module.exports = { createLead, applyWebhook, recordConsent, addSuppression, requestHandoff, reviewHandoff, acceptHandoff, transitionLead, createDraft, reviewDraft, metrics, journey, inTransaction };
