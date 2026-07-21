const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const pool = require('../db');

const router = express.Router();
router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const result = await pool.query('SELECT * FROM users WHERE lower(email)=$1', [email]);
    const user = result.rows[0];
    const valid = user && await bcrypt.compare(password, user.password_hash);
    if (!valid || !user.active) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ ver: user.auth_version }, process.env.JWT_SECRET, { subject: user.id, expiresIn: '8h', issuer: 'referral-operations', audience: 'referral-web', algorithm: 'HS256' });
    res.json({ token, user: { id: user.id, organizationId: user.organization_id, email: user.email, name: user.name, role: user.role } });
  } catch (error) { next(error); }
});
router.get('/me', auth, (req, res) => res.json({ user: req.user }));
module.exports = router;
