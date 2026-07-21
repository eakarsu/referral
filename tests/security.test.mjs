import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const security = require('../server/workflow/security');
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('lifecycle state machine rejects skips and terminal reopening', () => {
  assert.doesNotThrow(() => security.assertTransition('ASSIGNED', 'QUALIFIED'));
  assert.throws(() => security.assertTransition('NEW', 'CONVERTED'), /cannot move/);
  assert.throws(() => security.assertTransition('CONVERTED', 'ENGAGED'), /cannot move/);
});

test('provider and webhook security is fail closed', () => {
  assert.equal(security.validateProviderUrl('https://provider.example'), 'https://provider.example');
  assert.throws(() => security.validateProviderUrl('http://127.0.0.1:8080'), /HTTPS/);
  assert.throws(() => security.validateProviderUrl('https://user:pass@provider.example'), /credential-free/);
  const body = Buffer.from('{"id":"evt-1"}');
  const crypto = require('crypto');
  const signature = crypto.createHmac('sha256', 'secret').update(body).digest('hex');
  assert.equal(security.verifyHmac('secret', body, `sha256=${signature}`), true);
  assert.equal(security.verifyHmac('wrong', body, signature), false);
  for (const ip of ['127.0.0.1', '10.0.0.3', '192.168.1.1', '::1', 'fd00::1']) assert.equal(security.isPrivate(ip), true);
});

test('launcher and runtime contain no destructive or generated behavior', () => {
  assert.doesNotMatch(read('start.sh'), /npm (install|ci)|createdb|psql|kill -9|seed|migrate/);
  assert.doesNotMatch(read('server/index.js'), /gap-features|routes\/ai|OPENROUTER/);
  assert.doesNotMatch(read('client/src/App.jsx'), /Gap|Codex|AIHub|AICoach/);
  assert.doesNotMatch(read('server/routes/auth.js'), /default-credentials|admin123|register/);
});

test('stable JSON gives deterministic hashes', () => {
  assert.equal(security.sha256(security.stableJson({ b: 2, a: 1 })), security.sha256(security.stableJson({ a: 1, b: 2 })));
  assert.notEqual(security.sha256(security.stableJson({ a: 1 })), security.sha256(security.stableJson({ a: 2 })));
});
