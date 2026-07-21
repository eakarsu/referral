const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const pool = require('./db');
const { loadConfig } = require('./config');
const { verifyMigrations } = require('./migrate');

function createApp({ providerTransport, allowTestProvider = false } = {}) {
  const config = loadConfig();
  const app = express();
  app.disable('x-powered-by');
  app.set('providerTransport', providerTransport);
  app.set('allowTestProvider', allowTestProvider && process.env.NODE_ENV === 'test');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cors({ origin(origin, callback) { if (!origin || config.corsOrigins.includes(origin)) return callback(null, true); callback(Object.assign(new Error('Origin is not allowed'), { status: 403 })); } }));
  app.use(express.json({ limit: '256kb', verify(req, res, buffer) { req.rawBody = Buffer.from(buffer); } }));
  app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }));
  app.use('/api/workflow/webhooks', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }));
  app.get('/api/health/live', (req, res) => res.json({ status: 'live' }));
  app.get('/api/health/ready', async (req, res) => { try { await verifyMigrations(pool); res.json({ status: 'ready' }); } catch { res.status(503).json({ status: 'not_ready' }); } });
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/workflow', require('./routes/workflow'));
  app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found' }));
  const staticDir = path.resolve(__dirname, '../client/dist');
  app.use(express.static(staticDir, { dotfiles: 'deny', index: false }));
  app.get('*', (req, res) => res.sendFile(path.join(staticDir, 'index.html'), (error) => { if (error && !res.headersSent) res.status(503).json({ error: 'Client build unavailable' }); }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (process.env.NODE_ENV !== 'test') console.error(error);
    res.status(error.status || (error.code === '23505' ? 409 : 500)).json({ error: error.status ? error.message : (error.code === '23505' ? 'Record already exists' : 'Internal server error') });
  });
  return app;
}

async function start() {
  const config = loadConfig();
  await verifyMigrations(pool);
  const server = createApp().listen(config.port, '127.0.0.1', () => console.log(`Referral Operations listening on ${config.port}`));
  const shutdown = () => server.close(async () => { await pool.end(); process.exit(0); });
  process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
}
if (require.main === module) start().catch((error) => { console.error(error.message); process.exit(1); });
module.exports = { createApp, start };
