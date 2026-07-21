const jwt = require('jsonwebtoken');
const pool = require('../db');

async function auth(req, res, next) {
  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Access token required' });
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET, { issuer: 'referral-operations', audience: 'referral-web', algorithms: ['HS256'] });
    const result = await pool.query('SELECT id,organization_id,email,name,role,active,auth_version FROM users WHERE id=$1', [payload.sub]);
    const user = result.rows[0];
    if (!user?.active || user.auth_version !== payload.ver) return res.status(401).json({ error: 'Session is no longer valid' });
    req.user = { id: user.id, organizationId: user.organization_id, email: user.email, name: user.name, role: user.role };
    next();
  } catch { res.status(401).json({ error: 'Invalid or expired token' }); }
}

const roles = (...allowed) => (req, res, next) => allowed.includes(req.user?.role) ? next() : res.status(403).json({ error: 'Insufficient permissions' });
module.exports = auth;
module.exports.roles = roles;
