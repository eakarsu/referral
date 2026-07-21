const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

function migrationFiles() {
  const directory = path.join(__dirname, 'migrations');
  return fs.readdirSync(directory).filter((item) => item.endsWith('.sql')).sort().map((name) => {
    const sql = fs.readFileSync(path.join(directory, name), 'utf8');
    return { name, sql, hash: crypto.createHash('sha256').update(sql).digest('hex') };
  });
}

async function migrate(pool) {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [681771]);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    for (const { name, sql, hash } of migrationFiles()) {
      const existing = await client.query('SELECT sha256 FROM schema_migrations WHERE name=$1', [name]);
      if (existing.rowCount) {
        if (existing.rows[0].sha256 !== hash) throw new Error(`Applied migration ${name} has changed`);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(name,sha256) VALUES($1,$2)', [name, hash]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [681771]).catch(() => {});
    client.release();
  }
}

async function verifyMigrations(pool) {
  let applied;
  try { applied = await pool.query('SELECT name,sha256 FROM schema_migrations ORDER BY name'); }
  catch { throw new Error('Database migrations have not been applied'); }
  const expected = migrationFiles();
  if (applied.rowCount !== expected.length) throw new Error('Database migration set does not match this application release');
  for (const migration of expected) {
    const record = applied.rows.find((row) => row.name === migration.name);
    if (!record || record.sha256 !== migration.hash) throw new Error(`Database migration ${migration.name} is missing or has changed`);
  }
  return true;
}

if (require.main === module) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  migrate(pool).then(() => pool.end()).catch(async (error) => { console.error(error.message); await pool.end(); process.exitCode = 1; });
}

module.exports = { migrate, verifyMigrations, migrationFiles };
