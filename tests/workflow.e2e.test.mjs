import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const connectionString = process.env.TEST_DATABASE_URL;
const maybeTest = connectionString ? test : test.skip;

maybeTest('signed, deduplicated referral journey reaches conversion with governed outreach', async (t) => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = connectionString;
  process.env.JWT_SECRET = 'test-secret-that-is-definitely-longer-than-thirty-two-characters';
  process.env.CORS_ORIGINS = 'http://127.0.0.1:5179';
  process.env.ORGANIZATION_POSTAL_ADDRESS = '100 Test Street, Test City, NY 10001';
  process.env.CRM_TOKEN = 'crm-token'; process.env.CRM_WEBHOOK = 'crm-hook';
  process.env.CONSENT_TOKEN = 'consent-token'; process.env.CONSENT_WEBHOOK = 'consent-hook';
  process.env.EMAIL_TOKEN = 'email-token'; process.env.EMAIL_WEBHOOK = 'email-hook';
  process.env.CALENDAR_TOKEN = 'calendar-token'; process.env.CALENDAR_WEBHOOK = 'calendar-hook';
  process.env.ENRICH_TOKEN = 'enrich-token'; process.env.ENRICH_WEBHOOK = 'enrich-hook';
  process.env.SUPPRESS_TOKEN = 'suppress-token'; process.env.SUPPRESS_WEBHOOK = 'suppress-hook';

  const { Pool } = require('../server/node_modules/pg');
  const bcrypt = require('../server/node_modules/bcryptjs');
  const jwt = require('../server/node_modules/jsonwebtoken');
  const request = require('../server/node_modules/supertest');
  const pool = require('../server/db');
  const { migrate } = require('../server/migrate');
  await migrate(pool); await migrate(pool);
  await pool.query(`UPDATE schema_migrations SET sha256='tampered' WHERE name='001_governed_referral.sql'`);
  await assert.rejects(() => migrate(pool), /has changed/);
  const migrationSql = await readFile(new URL('../server/migrations/001_governed_referral.sql', import.meta.url));
  await pool.query(`UPDATE schema_migrations SET sha256=$1 WHERE name='001_governed_referral.sql'`, [crypto.createHash('sha256').update(migrationSql).digest('hex')]);
  t.after(async () => { await pool.end(); });

  for (const table of ['audit_events','outbox_operations','outreach_deliveries','outreach_drafts','handoffs','lifecycle_events','suppressions','consent_records','sync_events','provider_connections','leads','accounts','users','organizations']) await pool.query(`TRUNCATE ${table} CASCADE`);
  const org = (await pool.query(`INSERT INTO organizations(name) VALUES('Test Brokerage') RETURNING id`)).rows[0];
  const hash = await bcrypt.hash('correct horse battery staple', 4);
  const makeUser = async (name, email, role) => (await pool.query('INSERT INTO users(organization_id,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5) RETURNING *', [org.id, name, email, hash, role])).rows[0];
  const admin = await makeUser('Admin', 'admin@example.test', 'ADMIN');
  const manager = await makeUser('Manager', 'manager@example.test', 'MANAGER');
  const agent = await makeUser('Agent', 'agent@example.test', 'AGENT');
  const token = (user) => jwt.sign({ ver: user.auth_version }, process.env.JWT_SECRET, { subject: user.id, expiresIn: '1h', issuer: 'referral-operations', audience: 'referral-web', algorithm: 'HS256' });
  const adminToken = token(admin), managerToken = token(manager), agentToken = token(agent);
  const providerSpecs = [
    ['CRM Main','CRM','CRM_TOKEN','CRM_WEBHOOK'], ['Consent Main','CONSENT','CONSENT_TOKEN','CONSENT_WEBHOOK'],
    ['Email Main','EMAIL','EMAIL_TOKEN','EMAIL_WEBHOOK'], ['Calendar Main','CALENDAR','CALENDAR_TOKEN','CALENDAR_WEBHOOK'],
    ['Enrichment Main','ENRICHMENT','ENRICH_TOKEN','ENRICH_WEBHOOK'], ['Suppression Main','SUPPRESSION','SUPPRESS_TOKEN','SUPPRESS_WEBHOOK'],
  ];
  const providers = {};
  for (const [name, type, tokenEnv, hookEnv] of providerSpecs) {
    providers[type] = (await pool.query(`INSERT INTO provider_connections(organization_id,name,type,base_url,token_env,webhook_secret_env,contract_ref,active) VALUES($1,$2,$3,'https://provider.example',$4,$5,'DPA-TEST',true) RETURNING *`, [org.id, name, type, tokenEnv, hookEnv])).rows[0];
  }
  const outbound = [];
  const transport = async (url, options) => { outbound.push({ url: String(url), key: options.headers['idempotency-key'], body: JSON.parse(options.body) }); return new Response(JSON.stringify({ id: `provider-${outbound.length}` }), { status: 200, headers: { 'content-type': 'application/json' } }); };
  const { createApp } = require('../server/index');
  const app = createApp({ providerTransport: transport, allowTestProvider: true });
  const signed = (provider, envelope) => {
    const raw = JSON.stringify(envelope);
    const signature = crypto.createHmac('sha256', process.env[provider.webhook_secret_env]).update(raw).digest('hex');
    return request(app).post(`/api/workflow/webhooks/${provider.id}`).set('content-type', 'application/json').set('x-workflow-signature', `sha256=${signature}`).send(raw);
  };
  const occurred = new Date(Date.now() - 1000).toISOString();
  const leadEnvelope = { id: 'crm-event-1', type: 'lead.upsert', sourceOccurredAt: occurred, data: { externalId: 'crm-lead-77', firstName: 'Avery', lastName: 'Buyer', email: ' Avery@Example.Test ', accountName: 'Avery Household', privacyRegion: 'US_CAN_SPAM', campaign: 'Partner referral' } };
  const inbound = await signed(providers.CRM, leadEnvelope).expect(202);
  assert.equal(inbound.body.deduplicated, false);
  const leadId = inbound.body.leadId;
  const replay = await signed(providers.CRM, leadEnvelope).expect(200);
  assert.equal(replay.body.replay, true);
  await signed(providers.CRM, { ...leadEnvelope, data: { ...leadEnvelope.data, firstName: 'Changed' } }).expect(409);
  await signed(providers.CRM, { id: 'crm-stale', type: 'lead.upsert', sourceOccurredAt: new Date(Date.now() - 60_000).toISOString(), data: leadEnvelope.data }).expect(202).expect((res) => assert.equal(res.body.quarantined, true));
  const handoff = await request(app).post(`/api/workflow/leads/${leadId}/handoffs`).set('authorization', `Bearer ${adminToken}`).send({ toUserId: agent.id, reason: 'Geographic territory assignment' }).expect(201);
  await request(app).post(`/api/workflow/handoffs/${handoff.body.id}/review`).set('authorization', `Bearer ${adminToken}`).send({ decision: 'approve' }).expect(409);
  await request(app).post(`/api/workflow/handoffs/${handoff.body.id}/review`).set('authorization', `Bearer ${managerToken}`).send({ decision: 'approve' }).expect(200);
  await request(app).post(`/api/workflow/handoffs/${handoff.body.id}/accept`).set('authorization', `Bearer ${managerToken}`).send({}).expect(403);
  await request(app).post(`/api/workflow/handoffs/${handoff.body.id}/accept`).set('authorization', `Bearer ${agentToken}`).send({}).expect(200);

  let lead = (await pool.query('SELECT * FROM leads WHERE id=$1', [leadId])).rows[0];
  const qualified = await request(app).patch(`/api/workflow/leads/${leadId}/lifecycle`).set('authorization', `Bearer ${agentToken}`).send({ lifecycle: 'QUALIFIED', expectedVersion: lead.version, reason: 'Need and budget confirmed' }).expect(200);
  await request(app).patch(`/api/workflow/leads/${leadId}/lifecycle`).set('authorization', `Bearer ${agentToken}`).send({ lifecycle: 'ENGAGED', expectedVersion: lead.version, reason: 'stale write' }).expect(409);
  const draft = await request(app).post(`/api/workflow/leads/${leadId}/outreach`).set('authorization', `Bearer ${agentToken}`).send({ subject: 'Your consultation', body: 'Thank you for your referral. Here are the next steps.', calendarAt: new Date(Date.now() + 86_400_000).toISOString() }).expect(201);
  await request(app).post(`/api/workflow/outreach/${draft.body.id}/review`).set('authorization', `Bearer ${agentToken}`).send({ decision: 'approve' }).expect(403);
  await request(app).post(`/api/workflow/outreach/${draft.body.id}/review`).set('authorization', `Bearer ${managerToken}`).send({ decision: 'approve' }).expect(409).expect((res) => assert.match(res.body.error, /consent/i));
  const consentEnvelope = { id: 'consent-1', type: 'consent.updated', sourceOccurredAt: new Date().toISOString(), data: { email: 'avery@example.test', status: 'GRANTED', source: 'Web form', purpose: 'Requested property consultation', evidence: { formVersion: '2026-07' } } };
  await signed(providers.CONSENT, consentEnvelope).expect(202);
  await signed(providers.CONSENT, consentEnvelope).expect(200);
  await request(app).post(`/api/workflow/outreach/${draft.body.id}/review`).set('authorization', `Bearer ${managerToken}`).send({ decision: 'approve', reason: 'Consent, content, identity and timing verified' }).expect(200);
  const work = await request(app).post('/api/workflow/operations/run').set('authorization', `Bearer ${managerToken}`).send({ limit: 25 }).expect(200);
  assert.ok(work.body.succeeded >= 4);
  assert.ok(outbound.some((item) => item.body.kind === 'CRM_UPSERT'));
  assert.ok(outbound.some((item) => item.body.kind === 'EMAIL_SEND' && item.body.payload.body.includes('Unsubscribe:')));
  assert.ok(outbound.some((item) => item.body.kind === 'CALENDAR_CREATE'));
  const delivery = (await pool.query('SELECT * FROM outreach_deliveries WHERE lead_id=$1', [leadId])).rows[0];
  await signed(providers.EMAIL, { id: 'delivery-1', type: 'email.delivery', sourceOccurredAt: new Date().toISOString(), data: { messageId: delivery.provider_message_id, status: 'DELIVERED' } }).expect(202);
  const secondDraft = await request(app).post(`/api/workflow/leads/${leadId}/outreach`).set('authorization', `Bearer ${agentToken}`).send({ subject: 'Too soon', body: 'This second message should be rate limited.' }).expect(201);
  await request(app).post(`/api/workflow/outreach/${secondDraft.body.id}/review`).set('authorization', `Bearer ${managerToken}`).send({ decision: 'approve' }).expect(429);

  lead = (await pool.query('SELECT * FROM leads WHERE id=$1', [leadId])).rows[0];
  const engaged = await request(app).patch(`/api/workflow/leads/${leadId}/lifecycle`).set('authorization', `Bearer ${agentToken}`).send({ lifecycle: 'ENGAGED', expectedVersion: lead.version, reason: 'Lead replied and attended consultation' }).expect(200);
  await request(app).patch(`/api/workflow/leads/${leadId}/lifecycle`).set('authorization', `Bearer ${agentToken}`).send({ lifecycle: 'CONVERTED', expectedVersion: engaged.body.version, reason: 'Signed buyer representation agreement' }).expect(200);
  const metrics = await request(app).get('/api/workflow/metrics').set('authorization', `Bearer ${managerToken}`).expect(200);
  assert.equal(metrics.body.lifecycle.CONVERTED, 1); assert.equal(metrics.body.conversionRate, 1); assert.equal(metrics.body.dataQuality.syncQuarantined, 1);
  const otherOrg = (await pool.query(`INSERT INTO organizations(name) VALUES('Other Brokerage') RETURNING id`)).rows[0];
  const otherUser = (await pool.query(`INSERT INTO users(organization_id,name,email,password_hash,role) VALUES($1,'Other Manager','other@example.test',$2,'MANAGER') RETURNING *`, [otherOrg.id, hash])).rows[0];
  const foreignLead = (await pool.query(`INSERT INTO leads(organization_id,first_name,last_name,email,normalized_email,privacy_region) VALUES($1,'Foreign','Lead','foreign@example.test','foreign@example.test','US_CAN_SPAM') RETURNING *`, [otherOrg.id])).rows[0];
  const otherToken = token(otherUser);
  const otherLeads = await request(app).get('/api/workflow/leads').set('authorization', `Bearer ${otherToken}`).expect(200);
  assert.deepEqual(otherLeads.body.map((item) => item.id), [foreignLead.id]);
  await request(app).get(`/api/workflow/leads/${foreignLead.id}/journey`).set('authorization', `Bearer ${managerToken}`).expect(404);
  await pool.query('UPDATE users SET active=false WHERE id=$1', [otherUser.id]);
  await request(app).get('/api/auth/me').set('authorization', `Bearer ${otherToken}`).expect(401);
  const journey = await request(app).get(`/api/workflow/leads/${leadId}/journey`).set('authorization', `Bearer ${agentToken}`).expect(200);
  assert.equal(journey.body.lead.lifecycle, 'CONVERTED'); assert.equal(journey.body.consents.length, 1); assert.equal(journey.body.outreach[0].deliveries[0].status, 'DELIVERED');
  await request(app).post(`/api/workflow/leads/${leadId}/consent`).set('authorization', `Bearer ${managerToken}`).send({ status: 'REVOKED', source: 'Recorded phone request', purpose: 'Stop referral follow-up', evidence: { callRecord: 'call-77' } }).expect(201);
  await request(app).post('/api/workflow/operations/run').set('authorization', `Bearer ${managerToken}`).send({ limit: 25 }).expect(200);
  assert.ok(outbound.some((item) => item.body.kind === 'CONSENT_EXPORT'));
  assert.ok(outbound.some((item) => item.body.kind === 'SUPPRESSION_EXPORT'));
  const conflictLead = (await pool.query(`INSERT INTO leads(organization_id,owner_user_id,first_name,last_name,email,normalized_email,lifecycle,privacy_region) VALUES($1,$2,'Casey','Conflict','casey@example.test','casey@example.test','ASSIGNED','US_CAN_SPAM') RETURNING *`, [org.id, agent.id])).rows[0];
  const conflictHandoff = await request(app).post(`/api/workflow/leads/${conflictLead.id}/handoffs`).set('authorization', `Bearer ${agentToken}`).send({ toUserId: manager.id, reason: 'Coverage handoff' }).expect(201);
  await request(app).post(`/api/workflow/handoffs/${conflictHandoff.body.id}/review`).set('authorization', `Bearer ${managerToken}`).send({ decision: 'approve' }).expect(409);
  await request(app).post(`/api/workflow/handoffs/${conflictHandoff.body.id}/review`).set('authorization', `Bearer ${adminToken}`).send({ decision: 'approve' }).expect(200);
  await pool.query('UPDATE leads SET owner_user_id=$2,version=version+1 WHERE id=$1', [conflictLead.id, admin.id]);
  const retryHandoff = await request(app).post(`/api/workflow/handoffs/${conflictHandoff.body.id}/accept`).set('authorization', `Bearer ${managerToken}`).send({}).expect(409);
  assert.equal(retryHandoff.body.status, 'RETRY_REQUIRED');
  const audit = await request(app).get('/api/workflow/audit/verify').set('authorization', `Bearer ${adminToken}`).expect(200);
  assert.equal(audit.body.valid, true); assert.ok(audit.body.checked >= 8);
  await assert.rejects(() => pool.query(`UPDATE audit_events SET action='TAMPERED' WHERE organization_id=$1`, [org.id]), /immutable/);
});

maybeTest('outbox retries are bounded and webhook opt-out cancels queued outreach', async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = connectionString;
  process.env.JWT_SECRET = 'test-secret-that-is-definitely-longer-than-thirty-two-characters';
  process.env.CORS_ORIGINS = 'http://127.0.0.1:5179';
  process.env.EMAIL_TOKEN = 'email-token';
  const { Pool } = require('../server/node_modules/pg');
  const isolated = new Pool({ connectionString });
  const { runOperations } = require('../server/workflow/provider');
  const org = (await isolated.query('SELECT id FROM organizations LIMIT 1')).rows[0];
  const email = (await isolated.query(`SELECT * FROM provider_connections WHERE organization_id=$1 AND type='EMAIL'`, [org.id])).rows[0];
  const lead = (await isolated.query('SELECT * FROM leads WHERE organization_id=$1 LIMIT 1', [org.id])).rows[0];
  const key = `failure:${crypto.randomUUID()}`;
  const operation = (await isolated.query(`INSERT INTO outbox_operations(organization_id,provider_connection_id,lead_id,kind,payload,idempotency_key) VALUES($1,$2,$3,'CRM_UPSERT','{}',$4) RETURNING *`, [org.id, email.id, lead.id, key])).rows[0];
  const failure = async () => { throw new Error('provider unavailable'); };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await isolated.query(`UPDATE outbox_operations SET next_attempt_at=now() WHERE id=$1`, [operation.id]);
    await runOperations(isolated, { organizationId: org.id, transport: failure, skipDns: true });
  }
  const dead = (await isolated.query('SELECT status,attempts,last_error FROM outbox_operations WHERE id=$1', [operation.id])).rows[0];
  assert.equal(dead.status, 'DEAD_LETTER'); assert.equal(dead.attempts, 3); assert.match(dead.last_error, /provider unavailable/);
  const requester = (await isolated.query(`SELECT id FROM users WHERE organization_id=$1 AND role='AGENT' LIMIT 1`, [org.id])).rows[0];
  const draft = (await isolated.query(`INSERT INTO outreach_drafts(organization_id,lead_id,requester_user_id,subject,body,status) VALUES($1,$2,$3,'Queued follow-up','Body','APPROVED') RETURNING *`, [org.id, lead.id, requester.id])).rows[0];
  const queuedKey = `queued:${crypto.randomUUID()}`;
  await isolated.query(`INSERT INTO outreach_deliveries(organization_id,outreach_draft_id,lead_id,idempotency_key) VALUES($1,$2,$3,$4)`, [org.id, draft.id, lead.id, queuedKey]);
  await isolated.query(`INSERT INTO outbox_operations(organization_id,provider_connection_id,lead_id,kind,payload,idempotency_key) VALUES($1,$2,$3,'EMAIL_SEND','{}',$4)`, [org.id, email.id, lead.id, queuedKey]);
  const suppressionProvider = (await isolated.query(`SELECT * FROM provider_connections WHERE organization_id=$1 AND type='SUPPRESSION'`, [org.id])).rows[0];
  const { applyWebhook } = require('../server/workflow/service');
  await applyWebhook(isolated, suppressionProvider, { id: `suppression-${crypto.randomUUID()}`, type: 'suppression.created', sourceOccurredAt: new Date().toISOString(), data: { email: lead.normalized_email, reason: 'Customer opt-out' } });
  const cancelled = (await isolated.query('SELECT status FROM outbox_operations WHERE idempotency_key=$1', [queuedKey])).rows[0];
  const optedOut = (await isolated.query('SELECT status FROM outreach_deliveries WHERE idempotency_key=$1', [queuedKey])).rows[0];
  assert.equal(cancelled.status, 'CANCELLED'); assert.equal(optedOut.status, 'OPTED_OUT');
  await isolated.end();
});
