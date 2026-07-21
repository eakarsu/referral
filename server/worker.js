require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const pool = require('./db');
const { loadConfig } = require('./config');
const { verifyMigrations } = require('./migrate');
const { runOperations } = require('./workflow/provider');

async function cycle() {
  const organizations = await pool.query(`SELECT DISTINCT organization_id FROM outbox_operations WHERE status IN ('PENDING','RETRY') AND next_attempt_at<=now()`);
  for (const { organization_id: organizationId } of organizations.rows) {
    const result = await runOperations(pool, { organizationId, limit: 50 });
    if (result.claimed) console.log(JSON.stringify({ event: 'outbox_cycle', organizationId, ...result }));
  }
}

async function startWorker() {
  loadConfig();
  await verifyMigrations(pool);
  const interval = Number(process.env.WORKER_INTERVAL_MS || 10_000);
  if (!Number.isInteger(interval) || interval < 1000 || interval > 60_000) throw new Error('WORKER_INTERVAL_MS must be between 1000 and 60000');
  let stopping = false;
  const stop = async () => { stopping = true; await pool.end(); process.exit(0); };
  process.once('SIGTERM', stop); process.once('SIGINT', stop);
  while (!stopping) {
    try { await cycle(); } catch (error) { console.error(JSON.stringify({ event: 'outbox_cycle_failed', error: error.message })); }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

if (require.main === module) startWorker().catch(async (error) => { console.error(error.message); await pool.end(); process.exit(1); });
module.exports = { cycle, startWorker };
