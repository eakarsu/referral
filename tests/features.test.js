const test = require('node:test');
const assert = require('node:assert/strict');
const { filterLeads, toCsv, leadPriority, consentGap, providerConfig, maybeProvider } = require('../server/lib/features');
test('filterLeads search and lifecycle', () => {
  const rows=[{id:1,email:'a@x.io',lifecycle:'QUALIFIED'},{id:2,email:'b@x.io',lifecycle:'NEW'}];
  assert.equal(filterLeads(rows,{search:'a@x'}).length,1);
  assert.equal(filterLeads(rows,{lifecycle:'NEW'})[0].id,2);
});
test('toCsv preserves false and 0', () => { assert.match(toCsv([{id:1,blocked:false,score:0}]), /false/); assert.match(toCsv([{id:1,blocked:false,score:0}]), /"0"/); });
test('AI fallback is labelled aiGenerated:false', () => {
  const r=leadPriority([{id:1,lifecycle:'QUALIFIED'}]); assert.equal(r.aiGenerated,false); assert.ok(r.sections.length);
  assert.equal(consentGap([]).sections[0].items.zeroLeads,true);
});
test('provider only when key configured, else fallback', async () => {
  assert.equal(providerConfig({}), null);
  assert.equal(providerConfig({ OPENAI_API_KEY: 'sk-test' }).name, 'openai');
  const fb = leadPriority([]);
  assert.equal(await maybeProvider('lead-priority', fb, {}), fb);
  const fake = async () => ({ ok: true, json: async () => ({ model: 'm1', choices: [{ message: { content: 'grounded' } }] }) });
  const pv = await maybeProvider('lead-priority', fb, { OPENAI_API_KEY: 'sk-test' }, fake);
  assert.equal(pv.aiGenerated, true);
  assert.equal(pv.sections[0].items.total, 0);
});
