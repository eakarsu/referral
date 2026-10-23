'use strict';
function filterLeads(rows = [], q = {}) {
  let out = rows.slice();
  const s = String(q.search || q.q || '').toLowerCase();
  if (s) out = out.filter((r) => Object.values(r || {}).some((v) => String(v ?? '').toLowerCase().includes(s)));
  if (q.lifecycle) out = out.filter((r) => String(r.lifecycle || '') === String(q.lifecycle));
  if (q.status) out = out.filter((r) => String(r.status || r.lifecycle || '') === String(q.status));
  return out;
}
function toCsv(rows = []) {
  if (!rows.length) return 'id\n';
  const keys = Object.keys(rows[0]);
  const esc = (v) => '"' + String(v == null ? '' : Array.isArray(v) ? v.join('|') : typeof v === 'object' ? JSON.stringify(v) : v).replace(/"/g, '""') + '"';
  return [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n');
}
function leadPriority(rows = []) {
  const scored = rows.map((r) => ({ id: r.id, email: r.email || '', score: (r.lifecycle === 'QUALIFIED' ? 40 : 0), blocked: false }));
  return { aiGenerated: false, mode: 'deterministic-fallback', feature: 'lead-priority', summary: `${rows.length} leads scored deterministically.`, sections: [{ label: 'Counts', items: { total: rows.length, qualified: rows.filter((r) => r.lifecycle === 'QUALIFIED').length } }, { label: 'Top leads', items: scored.slice(0, 5) }], disclaimer: 'Deterministic fallback - not AI generated.' };
}
function consentGap(rows = []) {
  const missing = rows.filter((r) => String(r.consent_status ?? r.consentStatus ?? '') !== 'GRANTED');
  return { aiGenerated: false, mode: 'deterministic-fallback', feature: 'consent-gap', summary: `${missing.length} leads without recorded consent status.`, sections: [{ label: 'Counts', items: { total: rows.length, missingConsent: missing.length, zeroLeads: rows.length === 0 } }], disclaimer: 'Deterministic fallback - not AI generated.' };
}
function handoffBrief(rows = []) {
  return { aiGenerated: false, mode: 'deterministic-fallback', feature: 'handoff-brief', summary: `${rows.length} handoffs summarised.`, sections: [{ label: 'Counts', items: { total: rows.length, pending: rows.filter((r) => r.status === 'REQUESTED').length } }], disclaimer: 'Deterministic fallback - not AI generated.' };
}
function providerConfig(env = process.env) {
  if (env.OPENROUTER_API_KEY && !/changeme|your[_-]?key|placeholder/i.test(env.OPENROUTER_API_KEY)) return { name: 'openrouter', key: env.OPENROUTER_API_KEY, model: env.OPENROUTER_MODEL || 'openai/gpt-4o-mini', url: 'https://openrouter.ai/api/v1/chat/completions' };
  if (env.OPENAI_API_KEY && !/changeme|your[_-]?key|placeholder/i.test(env.OPENAI_API_KEY)) return { name: 'openai', key: env.OPENAI_API_KEY, model: env.OPENAI_MODEL || 'gpt-4o-mini', url: 'https://api.openai.com/v1/chat/completions' };
  return null;
}
async function maybeProvider(feature, fallback, env = process.env, fetchImpl = globalThis.fetch) {
  const cfg = providerConfig(env);
  if (!cfg || typeof fetchImpl !== 'function') return fallback;
  try {
    const r = await fetchImpl(cfg.url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.key }, body: JSON.stringify({ model: cfg.model, messages: [{ role: 'system', content: 'Return concise JSON for referral operations. Ground every claim in the supplied records.' }, { role: 'user', content: feature + ': ' + JSON.stringify(fallback).slice(0, 4000) }] }) });
    if (!r.ok) return fallback;
    const j = await r.json();
    const text = j.choices?.[0]?.message?.content;
    if (!text) return fallback;
    return { ...fallback, aiGenerated: true, mode: 'provider', provider: cfg.name, model: j.model || cfg.model, providerText: text };
  } catch { return fallback; }
}
module.exports = { filterLeads, toCsv, leadPriority, consentGap, handoffBrief, providerConfig, maybeProvider };
