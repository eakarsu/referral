const crypto = require('crypto');
const dns = require('dns').promises;
const net = require('net');

const TRANSITIONS = Object.freeze({
  NEW: ['ASSIGNED', 'DISQUALIFIED'], ASSIGNED: ['QUALIFIED', 'DISQUALIFIED'],
  QUALIFIED: ['OUTREACH_READY', 'DISQUALIFIED'], OUTREACH_READY: ['ENGAGED', 'DISQUALIFIED'],
  ENGAGED: ['CONVERTED', 'DISQUALIFIED'], CONVERTED: [], DISQUALIFIED: [],
});

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const normalizeName = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
function verifyHmac(secret, body, supplied) {
  if (!secret || !supplied) return false;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const actual = String(supplied).replace(/^sha256=/, '');
  return expected.length === actual.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}
function validateProviderUrl(value) {
  let parsed;
  try { parsed = new URL(value); } catch { throw problem('Provider URL is invalid'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw problem('Provider URL must be a credential-free HTTPS origin on the default port');
  }
  return parsed.origin;
}
function isPrivate(address) {
  if (net.isIPv4(address)) {
    const p = address.split('.').map(Number);
    return p[0] === 0 || p[0] === 10 || p[0] === 127 || (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168);
  }
  if (net.isIPv6(address)) return address === '::1' || /^(fc|fd|fe80:)/i.test(address);
  return true;
}
async function assertPublicHost(hostname) {
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records.length || records.some(({ address }) => isPrivate(address))) throw new Error('Provider resolved to a private or unavailable address');
}
function problem(message, status = 400) { return Object.assign(new Error(message), { status }); }
function requiredText(value, name, max = 200) {
  const result = String(value || '').trim();
  if (!result) throw problem(`${name} is required`);
  if (result.length > max) throw problem(`${name} is too long`);
  return result;
}
function parseSourceTime(value) {
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) throw problem('sourceOccurredAt must be an ISO timestamp');
  if (time.getTime() > Date.now() + 300_000) throw problem('sourceOccurredAt is too far in the future');
  return time;
}
function assertTransition(from, to) {
  if (!(TRANSITIONS[from] || []).includes(to)) throw problem(`Lifecycle cannot move from ${from} to ${to}`, 409);
}

module.exports = { TRANSITIONS, normalizeEmail, normalizeName, validEmail, stableJson, sha256, verifyHmac, validateProviderUrl, isPrivate, assertPublicHost, problem, requiredText, parseSourceTime, assertTransition };
