// === Batch 11 Gaps & Frontend Mounts ===
// Gap features (AI counterparts + Non-AI features) for referral.
// Lazy gap_features table (in-memory), OpenRouter via native fetch.

const express = require('express');
const router = express.Router();

const gapFeatures = new Map();

async function llm(systemPrompt, userMsg, maxTokens = 1400) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) { const e = new Error('OPENROUTER_API_KEY not configured'); e.status = 503; throw e; }
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'referral Gap Features' },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMsg }], max_tokens: maxTokens }),
  });
  const data = await r.json();
  if (data && data.error) throw new Error(data.error.message || 'LLM error');
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
}

function track(slug, payload) {
  const list = gapFeatures.get(slug) || [];
  list.push({ at: new Date().toISOString(), payload });
  gapFeatures.set(slug, list);
}

function safe(res, e) { return res.status((e && e.status) || 500).json({ error: (e && e.message) || 'request failed' }); }

// ---- AI Gap Counterparts ----

router.post('/gap-contact-sync-assistant', async (req, res) => {
  try {
    const body = req.body || {};
    const sys = "You map and de-duplicate imported contacts to existing records, merging fields safely.";
    const user = `Body: ${JSON.stringify(body).slice(0, 4000)}`;
    const out = await llm(sys, user);
    track('contact-sync-assistant', { keys: Object.keys(body) });
    res.json({ mapping: out });
  } catch (e) { safe(res, e); }
});

router.post('/gap-network-health-graph', async (req, res) => {
  try {
    const body = req.body || {};
    const sys = "You analyze network strength: hubs, weak ties, opportunities to strengthen relationships.";
    const user = `Body: ${JSON.stringify(body).slice(0, 4000)}`;
    const out = await llm(sys, user);
    track('network-health-graph', { keys: Object.keys(body) });
    res.json({ graph: out });
  } catch (e) { safe(res, e); }
});

router.post('/gap-referral-roi-attribution', async (req, res) => {
  try {
    const body = req.body || {};
    const sys = "You attribute ROI to referral sources across multi-touch journeys.";
    const user = `Body: ${JSON.stringify(body).slice(0, 4000)}`;
    const out = await llm(sys, user);
    track('referral-roi-attribution', { keys: Object.keys(body) });
    res.json({ attribution: out });
  } catch (e) { safe(res, e); }
});

router.post('/gap-relationship-churn', async (req, res) => {
  try {
    const body = req.body || {};
    const sys = "You predict which relationships will go cold; suggest interventions.";
    const user = `Body: ${JSON.stringify(body).slice(0, 4000)}`;
    const out = await llm(sys, user);
    track('relationship-churn', { keys: Object.keys(body) });
    res.json({ risk: out });
  } catch (e) { safe(res, e); }
});

// ---- Non-AI Gap Features ----

router.post('/gap-crm-integration', (req, res) => {
  const body = req.body || {};
  const record = { id: 'crm-integration_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('crm-integration', record);
  res.json({ syncJob: record, status: 'recorded' });
});

router.post('/gap-email-sms-execution', (req, res) => {
  const body = req.body || {};
  const record = { id: 'email-sms-execution_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('email-sms-execution', record);
  res.json({ send: record, status: 'recorded' });
});

router.post('/gap-commission-tracking', (req, res) => {
  const body = req.body || {};
  const record = { id: 'commission-tracking_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('commission-tracking', record);
  res.json({ commission: record, status: 'recorded' });
});

router.post('/gap-mobile-app', (req, res) => {
  const body = req.body || {};
  const record = { id: 'mobile-app_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('mobile-app', record);
  res.json({ event: record, status: 'recorded' });
});

router.post('/gap-calendar-sync', (req, res) => {
  const body = req.body || {};
  const record = { id: 'calendar-sync_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('calendar-sync', record);
  res.json({ event: record, status: 'recorded' });
});

router.post('/gap-bulk-import', (req, res) => {
  const body = req.body || {};
  const record = { id: 'bulk-import_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('bulk-import', record);
  res.json({ job: record, status: 'recorded' });
});

router.get('/gap-features/_audit', (req, res) => {
  const rows = [];
  for (const [k, v] of gapFeatures.entries()) rows.push({ feature: k, events: v.length });
  res.json({ rows });
});

module.exports = router;
