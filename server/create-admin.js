const bcrypt = require('bcryptjs');
const pool = require('./db');

async function main() {
  if (process.env.BOOTSTRAP_ACKNOWLEDGEMENT !== 'create-initial-admin') throw new Error('Explicit administrator bootstrap acknowledgement is required');
  const name = process.env.BOOTSTRAP_ADMIN_NAME || process.env.PROVISION_ADMIN_NAME || 'Runtime Administrator';
  const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL || process.env.PROVISION_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || process.env.PROVISION_ADMIN_PASSWORD || '';
  const organization = process.env.BOOTSTRAP_ORGANIZATION || process.env.BOOTSTRAP_TENANT_NAME || process.env.PROVISION_COMPANY_NAME || 'Runtime Acceptance Organization';
  if (!name || !email || !organization || password.length < 16) throw new Error('BOOTSTRAP_ORGANIZATION, BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL, and a 16+ character BOOTSTRAP_ADMIN_PASSWORD are required');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id,organization_id FROM users WHERE lower(email)=lower($1) FOR UPDATE', [email]);
    if (existing.rowCount) {
      await client.query("UPDATE users SET name=$1,password_hash=$2,role='ADMIN' WHERE id=$3", [name, await bcrypt.hash(password, 12), existing.rows[0].id]);
    } else {
      const org = await client.query('INSERT INTO organizations(name) VALUES($1) RETURNING id', [organization]);
      await client.query('INSERT INTO users(organization_id,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5)', [org.rows[0].id, name, email, await bcrypt.hash(password, 12), 'ADMIN']);
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); await pool.end(); }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
