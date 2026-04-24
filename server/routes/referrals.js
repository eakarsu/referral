const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*,
        c1.name as referrer_name,
        c2.name as referred_name
      FROM referrals r
      LEFT JOIN contacts c1 ON r.referrer_id = c1.id
      LEFT JOIN contacts c2 ON r.referred_id = c2.id
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, c1.name as referrer_name, c2.name as referred_name
      FROM referrals r
      LEFT JOIN contacts c1 ON r.referrer_id = c1.id
      LEFT JOIN contacts c2 ON r.referred_id = c2.id
      WHERE r.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { referrer_id, referred_id, status, value, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO referrals (referrer_id, referred_id, status, value, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [referrer_id, referred_id, status || 'pending', value || 0, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { referrer_id, referred_id, status, value, notes } = req.body;
    const result = await pool.query(
      `UPDATE referrals SET referrer_id=$1, referred_id=$2, status=$3, value=$4, notes=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [referrer_id, referred_id, status, value, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM referrals WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
