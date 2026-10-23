const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const auth = require('../middleware/auth');
const { roles } = auth;
const { appendAudit, verifyAudit } = require('../workflow/audit');
const { runOperations } = require('../workflow/provider');
const { validateProviderUrl, verifyHmac } = require('../workflow/security');
const service = require('../workflow/service');
const features = require('../lib/features');

const router = express.Router();
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.post('/webhooks/:connectionId', asyncRoute(async (req, res) => {
  const connection = (await pool.query('SELECT * FROM provider_connections WHERE id=$1 AND active=true', [req.params.connectionId])).rows[0];
  if (!connection) return res.status(404).json({ error: 'Active connection not found' });
  if (!verifyHmac(process.env[connection.webhook_secret_env], req.rawBody || Buffer.from(''), req.get('x-workflow-signature'))) return res.status(401).json({ error: 'Invalid webhook signature' });
  const result = await service.applyWebhook(pool, connection, req.body);
  res.status(result.replay ? 200 : 202).json(result);
}));

router.use(auth);

router.get('/users', asyncRoute(async (req, res) => {
  const result = await pool.query(`SELECT id,name,email,role,active FROM users WHERE organization_id=$1 AND active=true ORDER BY name`, [req.user.organizationId]);
  res.json(result.rows);
}));

router.post('/users', roles('ADMIN'), asyncRoute(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const role = req.body.role;
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 16 || !['ADMIN','MANAGER','AGENT'].includes(role)) return res.status(400).json({ error: 'Name, valid email, 16+ character password, and supported role are required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`INSERT INTO users(organization_id,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5) RETURNING id,name,email,role,active`, [req.user.organizationId, name, email, await bcrypt.hash(password, 12), role]);
    await appendAudit(client, { organizationId: req.user.organizationId, entityType: 'User', entityId: result.rows[0].id, action: 'CREATED', actorUserId: req.user.id, detail: { name, email, role } });
    await client.query('COMMIT'); res.status(201).json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));

router.patch('/users/:id', roles('ADMIN'), asyncRoute(async (req, res) => {
  if (req.params.id === req.user.id && req.body.active === false) return res.status(409).json({ error: 'Administrator cannot deactivate their current session' });
  if (req.body.role !== undefined && !['ADMIN','MANAGER','AGENT'].includes(req.body.role)) return res.status(400).json({ error: 'Unsupported role' });
  if (req.body.active !== undefined && typeof req.body.active !== 'boolean') return res.status(400).json({ error: 'active must be boolean' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const target = await client.query('SELECT * FROM users WHERE id=$1 AND organization_id=$2 FOR UPDATE', [req.params.id, req.user.organizationId]);
    if (!target.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'User not found' }); }
    if (target.rows[0].role === 'ADMIN' && target.rows[0].active && ((req.body.role && req.body.role !== 'ADMIN') || req.body.active === false)) {
      const admins = await client.query(`SELECT count(*)::int AS count FROM users WHERE organization_id=$1 AND role='ADMIN' AND active=true`, [req.user.organizationId]);
      if (admins.rows[0].count <= 1) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Organization must retain at least one active administrator' }); }
    }
    const result = await client.query(`UPDATE users SET role=COALESCE($3,role),active=COALESCE($4,active),auth_version=auth_version+1 WHERE id=$1 AND organization_id=$2 RETURNING id,name,email,role,active`, [req.params.id, req.user.organizationId, req.body.role ?? null, req.body.active ?? null]);
    await appendAudit(client, { organizationId: req.user.organizationId, entityType: 'User', entityId: result.rows[0].id, action: 'ACCESS_CHANGED', actorUserId: req.user.id, detail: { role: req.body.role ?? null, active: req.body.active ?? null } });
    await client.query('COMMIT'); res.json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));

router.get('/providers', roles('ADMIN','MANAGER'), asyncRoute(async (req, res) => {
  const result = await pool.query('SELECT * FROM provider_connections WHERE organization_id=$1 ORDER BY type,name', [req.user.organizationId]);
  res.json(result.rows.map(({ token_env, webhook_secret_env, ...row }) => ({ ...row, tokenConfigured: Boolean(process.env[token_env]), webhookSecretConfigured: Boolean(process.env[webhook_secret_env]) })));
}));

router.post('/providers', roles('ADMIN'), asyncRoute(async (req, res) => {
  const { name, type, baseUrl, tokenEnv, webhookSecretEnv, contractRef, active = false } = req.body;
  if (!['CRM','EMAIL','CALENDAR','ENRICHMENT','CONSENT','SUPPRESSION'].includes(type)) return res.status(400).json({ error: 'Unsupported provider type' });
  if (!/^[A-Z][A-Z0-9_]{2,80}$/.test(String(tokenEnv || '')) || !/^[A-Z][A-Z0-9_]{2,80}$/.test(String(webhookSecretEnv || ''))) return res.status(400).json({ error: 'Credential references must be uppercase environment variable names' });
  if (!String(name || '').trim() || !String(contractRef || '').trim()) return res.status(400).json({ error: 'Name and data-processing contract reference are required' });
  if (active && (!process.env[tokenEnv] || !process.env[webhookSecretEnv])) return res.status(409).json({ error: 'Credentials must exist in the environment before activation' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO provider_connections(organization_id,name,type,base_url,token_env,webhook_secret_env,contract_ref,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.organizationId, name.trim(), type, validateProviderUrl(baseUrl), tokenEnv, webhookSecretEnv, contractRef.trim(), Boolean(active)],
    );
    await appendAudit(client, { organizationId: req.user.organizationId, entityType: 'ProviderConnection', entityId: result.rows[0].id, action: 'CREATED', actorUserId: req.user.id, detail: { name, type, baseUrl, contractRef, active: Boolean(active) } });
    await client.query('COMMIT');
    res.status(201).json({ id: result.rows[0].id, name: result.rows[0].name, type, active: result.rows[0].active });
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));

router.patch('/providers/:id', roles('ADMIN'), asyncRoute(async (req, res) => {
  if (typeof req.body.active !== 'boolean') return res.status(400).json({ error: 'active must be boolean' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT * FROM provider_connections WHERE id=$1 AND organization_id=$2 FOR UPDATE', [req.params.id, req.user.organizationId]);
    if (!found.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Provider not found' }); }
    const provider = found.rows[0];
    if (req.body.active && (!process.env[provider.token_env] || !process.env[provider.webhook_secret_env])) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Provider credentials are missing from the environment' }); }
    const result = await client.query('UPDATE provider_connections SET active=$2,updated_at=now() WHERE id=$1 RETURNING id,name,type,active', [provider.id, req.body.active]);
    await appendAudit(client, { organizationId: req.user.organizationId, entityType: 'ProviderConnection', entityId: provider.id, action: req.body.active ? 'ACTIVATED' : 'DEACTIVATED', actorUserId: req.user.id, detail: { name: provider.name, type: provider.type } });
    await client.query('COMMIT'); res.json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));

router.get('/leads', asyncRoute(async (req, res) => {
  const values = [req.user.organizationId];
  let ownership = '';
  if (req.user.role === 'AGENT') { values.push(req.user.id); ownership = 'AND l.owner_user_id=$2'; }
  const result = await pool.query(`SELECT l.*,a.name AS account_name,u.name AS owner_name FROM leads l LEFT JOIN accounts a ON a.id=l.account_id LEFT JOIN users u ON u.id=l.owner_user_id WHERE l.organization_id=$1 ${ownership} ORDER BY l.created_at DESC LIMIT 200`, values);
  res.json(features.filterLeads(result.rows, req.query));
}));
router.post('/leads', roles('ADMIN','MANAGER','AGENT'), asyncRoute(async (req, res) => res.status(201).json(await service.createLead(pool, req.user, req.body))));
router.get('/leads/:id/journey', asyncRoute(async (req, res) => res.json(await service.journey(pool, req.user, req.params.id))));
router.patch('/leads/:id/lifecycle', roles('ADMIN','MANAGER','AGENT'), asyncRoute(async (req, res) => res.json(await service.transitionLead(pool, req.user, req.params.id, req.body))));
router.post('/leads/:id/consent', roles('ADMIN','MANAGER'), asyncRoute(async (req, res) => res.status(201).json(await service.recordConsent(pool, req.user, req.params.id, req.body))));
router.post('/leads/:id/suppressions', roles('ADMIN','MANAGER'), asyncRoute(async (req, res) => res.status(201).json(await service.addSuppression(pool, req.user, req.params.id, req.body))));
router.post('/leads/:id/handoffs', roles('ADMIN','MANAGER','AGENT'), asyncRoute(async (req, res) => res.status(201).json(await service.requestHandoff(pool, req.user, req.params.id, req.body))));
router.get('/handoffs/mine', asyncRoute(async (req, res) => {
  const result = await pool.query(`SELECT h.*,l.first_name,l.last_name FROM handoffs h JOIN leads l ON l.id=h.lead_id WHERE h.organization_id=$1 AND h.to_user_id=$2 AND h.status='APPROVED' ORDER BY h.created_at`, [req.user.organizationId, req.user.id]);
  res.json(result.rows);
}));
router.post('/handoffs/:id/review', roles('ADMIN','MANAGER'), asyncRoute(async (req, res) => {
  if (!['approve','reject'].includes(req.body.decision)) return res.status(400).json({ error: 'decision must be approve or reject' });
  res.json(await service.reviewHandoff(pool, req.user, req.params.id, req.body.decision, req.body.reason));
}));
router.post('/handoffs/:id/accept', roles('AGENT','MANAGER'), asyncRoute(async (req, res) => {
  const result = await service.acceptHandoff(pool, req.user, req.params.id);
  res.status(result.status === 'RETRY_REQUIRED' ? 409 : 200).json(result);
}));
router.post('/leads/:id/outreach', roles('ADMIN','MANAGER','AGENT'), asyncRoute(async (req, res) => res.status(201).json(await service.createDraft(pool, req.user, req.params.id, req.body))));
router.post('/outreach/:id/review', roles('ADMIN','MANAGER'), asyncRoute(async (req, res) => {
  if (!['approve','reject'].includes(req.body.decision)) return res.status(400).json({ error: 'decision must be approve or reject' });
  res.json(await service.reviewDraft(pool, req.user, req.params.id, req.body.decision, req.body.reason));
}));

router.get('/queue', roles('ADMIN','MANAGER'), asyncRoute(async (req, res) => {
  const [handoffs, outreach, operations] = await Promise.all([
    pool.query(`SELECT h.*,l.first_name,l.last_name,f.name AS from_name,t.name AS to_name FROM handoffs h JOIN leads l ON l.id=h.lead_id LEFT JOIN users f ON f.id=h.from_user_id JOIN users t ON t.id=h.to_user_id WHERE h.organization_id=$1 AND h.status IN ('REQUESTED','APPROVED','RETRY_REQUIRED') ORDER BY h.created_at`, [req.user.organizationId]),
    pool.query(`SELECT d.*,l.first_name,l.last_name,l.email FROM outreach_drafts d JOIN leads l ON l.id=d.lead_id WHERE d.organization_id=$1 AND d.status='PENDING_REVIEW' ORDER BY d.created_at`, [req.user.organizationId]),
    pool.query(`SELECT o.id,o.kind,o.status,o.attempts,o.next_attempt_at,o.last_error,p.name AS provider_name FROM outbox_operations o JOIN provider_connections p ON p.id=o.provider_connection_id WHERE o.organization_id=$1 AND o.status IN ('PENDING','PROCESSING','RETRY','DEAD_LETTER') ORDER BY o.created_at LIMIT 100`, [req.user.organizationId]),
  ]);
  res.json({ handoffs: handoffs.rows, outreach: outreach.rows, operations: operations.rows });
}));
router.post('/operations/run', roles('ADMIN','MANAGER'), asyncRoute(async (req, res) => res.json(await runOperations(pool, { organizationId: req.user.organizationId, limit: req.body.limit, transport: req.app.get('providerTransport') || fetch, skipDns: Boolean(req.app.get('allowTestProvider')) }))));
router.post('/operations/:id/retry', roles('ADMIN'), asyncRoute(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`UPDATE outbox_operations SET status='RETRY',attempts=0,next_attempt_at=now(),last_error=NULL,updated_at=now() WHERE id=$1 AND organization_id=$2 AND status='DEAD_LETTER' RETURNING *`, [req.params.id, req.user.organizationId]);
    if (!result.rowCount) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Only dead-letter operations can be retried' }); }
    await appendAudit(client, { organizationId: req.user.organizationId, entityType: 'OutboxOperation', entityId: result.rows[0].id, action: 'MANUAL_RETRY', actorUserId: req.user.id, detail: { kind: result.rows[0].kind } });
    await client.query('COMMIT'); res.json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}));
router.get('/leads/export', asyncRoute(async (req, res) => {
  const values=[req.user.organizationId]; let ownership='';
  if(req.user.role==='AGENT'){ values.push(req.user.id); ownership='AND l.owner_user_id=$2'; }
  const result=await pool.query(`SELECT l.*,a.name AS account_name FROM leads l LEFT JOIN accounts a ON a.id=l.account_id WHERE l.organization_id=$1 ${ownership} ORDER BY l.created_at DESC LIMIT 500`,values);
  const rows=features.filterLeads(result.rows, req.query);
  if(String(req.query.format||'csv').toLowerCase()==='json') return res.json({rows});
  res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition','attachment; filename="leads.csv"'); return res.send(features.toCsv(rows));
}));
router.get('/tasks', asyncRoute(async (req, res) => {
  const result=await pool.query('SELECT * FROM tasks WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 200',[req.user.organizationId]);
  return res.json({rows: features.filterLeads(result.rows, req.query)});
}));
router.post('/tasks', roles('ADMIN','MANAGER','AGENT'), asyncRoute(async (req, res) => {
  const title=String(req.body.title||'').trim(); if(!title) return res.status(400).json({error:'title is required'});
  const r=await pool.query('INSERT INTO tasks(organization_id,lead_id,title,status,priority,assignee_id,due_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[req.user.organizationId,req.body.lead_id||null,title,req.body.status||'open',req.body.priority||'medium',req.body.assignee_id||null,req.body.due_at||null,req.user.id]);
  return res.status(201).json(r.rows[0]);
}));
router.patch('/tasks/:id', roles('ADMIN','MANAGER','AGENT'), asyncRoute(async (req, res) => {
  const r=await pool.query('UPDATE tasks SET title=COALESCE($1,title),status=COALESCE($2,status),priority=COALESCE($3,priority),assignee_id=COALESCE($4,assignee_id),due_at=COALESCE($5,due_at),updated_at=now() WHERE id=$6 AND organization_id=$7 RETURNING *',[req.body.title||null,req.body.status||null,req.body.priority||null,req.body.assignee_id||null,req.body.due_at||null,req.params.id,req.user.organizationId]);
  if(!r.rowCount) return res.status(404).json({error:'Task not found'}); return res.json(r.rows[0]);
}));
const DOMAIN_AI_FEATURES = [
  { id: 'lead-priority', title: 'Lead priority scoring', source: 'leads' },
  { id: 'consent-gap', title: 'Consent gap review', source: 'leads' },
  { id: 'handoff-brief', title: 'Handoff bottleneck brief', source: 'handoffs' },
];
router.get('/ai/domain', asyncRoute(async (req, res) => {
  res.json({ features: DOMAIN_AI_FEATURES, providerConfigured: Boolean(features.providerConfig(process.env)) });
}));
router.post('/ai/domain/:featureId', asyncRoute(async (req, res) => {
  const feature = DOMAIN_AI_FEATURES.find((f) => f.id === req.params.featureId);
  if (!feature) return res.status(404).json({ error: 'Unknown AI feature' });
  let rows;
  if (feature.source === 'handoffs') {
    rows = (await pool.query('SELECT * FROM handoffs WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 200', [req.user.organizationId])).rows;
  } else {
    const values = [req.user.organizationId]; let ownership = '';
    if (req.user.role === 'AGENT') { values.push(req.user.id); ownership = 'AND l.owner_user_id=$2'; }
    rows = (await pool.query(`SELECT l.* FROM leads l WHERE l.organization_id=$1 ${ownership} ORDER BY l.created_at DESC LIMIT 200`, values)).rows;
  }
  const fallback = { 'lead-priority': features.leadPriority, 'consent-gap': features.consentGap, 'handoff-brief': features.handoffBrief }[feature.id](rows);
  return res.json(await features.maybeProvider(feature.id, fallback));
}));
router.get('/metrics', roles('ADMIN','MANAGER'), asyncRoute(async (req, res) => res.json(await service.metrics(pool, req.user.organizationId))));
router.get('/audit/verify', roles('ADMIN'), asyncRoute(async (req, res) => {
  const result = await verifyAudit(pool, req.user.organizationId);
  res.status(result.valid ? 200 : 409).json(result);
}));

module.exports = router;
