// AI Extras — Custom Feature Suggestions (batch 11)
// Follow-Up Orchestrator, LinkedIn Network Sync, Event-Driven Networking,
// Referral Attribution & ROI, White-Label Partner Portal, Voice-to-Record.

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

async function callOpenRouter(messages, systemPrompt) {
  if (!process.env.OPENROUTER_API_KEY) {
    const e = new Error('OPENROUTER_API_KEY not configured');
    e.status = 503;
    throw e;
  }
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'Referral Mastery Extras',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 1500,
    }),
  });
  const data = await r.json();
  if (data?.error) throw new Error(data.error.message || 'LLM error');
  return data;
}

function fail(res, e) { res.status(e?.status || 500).json({ error: e?.message || 'AI failed' }); }

// 1) Agentic Follow-Up Orchestrator
router.post('/follow-up-orchestrator', auth, async (req, res) => {
  try {
    const { contacts = [], cadenceDays = [1, 3, 7, 14] } = req.body || {};
    if (!contacts.length) return res.status(400).json({ error: 'contacts[] required' });
    const sys = 'You are a follow-up cadence orchestrator. For each contact (with lastContactDate + relationshipStage), generate next outreach (channel, subject, body) and schedule across the cadenceDays. Output JSON.';
    const user = `Cadence: ${JSON.stringify(cadenceDays)} days from last contact.\nContacts: ${JSON.stringify(contacts).slice(0, 6000)}`;
    const data = await callOpenRouter([{ role: 'user', content: user }], sys);
    res.json(data);
  } catch (e) { fail(res, e); }
});

// 2) LinkedIn Network Sync & Enrichment — import + match.
// TODO: configure credentials — LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET.
router.post('/linkedin-sync', auth, async (req, res) => {
  const { profiles = [] } = req.body || {};
  if (!profiles.length) return res.status(400).json({ error: 'profiles[] required' });
  if (!process.env.LINKEDIN_CLIENT_ID) {
    return res.status(503).json({ error: 'LINKEDIN_CLIENT_ID not configured', message: 'TODO: configure credentials.' });
  }
  // Lean v0 — accept LinkedIn profiles, return match suggestions vs. local DB.
  res.json({
    imported: profiles.length,
    matchSuggestions: profiles.map((p, i) => ({ profileIdx: i, suggestedContactId: null, confidence: 0 })),
    note: 'Wire actual LinkedIn fetch in production',
  });
});

// 3) Event-Driven Networking — pre/post-event suggestions.
router.post('/event-networking', auth, async (req, res) => {
  try {
    const { eventName, eventDate, attendees = [], phase = 'pre' } = req.body || {};
    if (!eventName) return res.status(400).json({ error: 'eventName required' });
    const sys = phase === 'post'
      ? 'You are a networking strategist. Generate thank-you messages and follow-up sequences for each attendee met. Output JSON.'
      : 'You are a networking strategist. Pre-event: rank attendees to prioritize, suggest opening lines and intros to facilitate. Output JSON.';
    const user = `Event: ${eventName} (${eventDate || 'date TBD'})\nAttendees: ${JSON.stringify(attendees).slice(0, 5000)}`;
    const data = await callOpenRouter([{ role: 'user', content: user }], sys);
    res.json(data);
  } catch (e) { fail(res, e); }
});

// 4) Referral Attribution & ROI — track referrer + commission calc.
router.post('/attribution-roi', auth, async (req, res) => {
  try {
    const { deals = [], commissionRate = 0.1 } = req.body || {};
    if (!deals.length) return res.status(400).json({ error: 'deals[] required' });
    const rows = deals.map((d) => ({
      dealId: d.id,
      referrerId: d.referrerId || null,
      valueUSD: Number(d.value || 0),
      commissionUSD: Number(d.value || 0) * commissionRate,
      stage: d.stage || 'closed-won',
    }));
    const summary = rows.reduce((s, r) => ({ totalValue: s.totalValue + r.valueUSD, totalCommission: s.totalCommission + r.commissionUSD }), { totalValue: 0, totalCommission: 0 });
    res.json({ commissionRate, rows, summary });
  } catch (e) { fail(res, e); }
});

// 5) White-Label Partner Portal — agency reseller config.
const partners = new Map();
router.post('/partners', auth, (req, res) => {
  const { partnerId, agencyName, primaryColor, logoUrl, contactEmail } = req.body || {};
  if (!partnerId || !agencyName) return res.status(400).json({ error: 'partnerId and agencyName required' });
  partners.set(partnerId, { partnerId, agencyName, primaryColor: primaryColor || '#0ea5e9', logoUrl, contactEmail, createdAt: new Date().toISOString() });
  res.json({ partner: partners.get(partnerId) });
});
router.get('/partners', auth, (_req, res) => {
  res.json({ partners: Array.from(partners.values()) });
});

// 6) Voice-to-Record — transcript -> CRM log + extract next steps.
router.post('/voice-to-record', auth, async (req, res) => {
  try {
    const { transcript, contactId, callDurationSec } = req.body || {};
    if (!transcript) return res.status(400).json({ error: 'transcript required' });
    const sys = 'You are a CRM call-log extractor. From transcript, produce: summary (3-line), nextSteps (list with owner+due), commitments made, sentiment. Output JSON.';
    const user = `Contact: ${contactId || 'unspecified'}\nDuration: ${callDurationSec || 'unspecified'}s\nTranscript:\n${transcript.slice(0, 8000)}`;
    const data = await callOpenRouter([{ role: 'user', content: user }], sys);
    res.json(data);
  } catch (e) { fail(res, e); }
});

module.exports = router;
