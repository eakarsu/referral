const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM referral_rewards ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM referral_rewards WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { referrer_name, reward_type, description, value, date_given, referral_source, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO referral_rewards (referrer_name, reward_type, description, value, date_given, referral_source, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [referrer_name, reward_type, description, value || 0, date_given, referral_source, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { referrer_name, reward_type, description, value, date_given, referral_source, notes } = req.body;
    const result = await pool.query(
      `UPDATE referral_rewards SET referrer_name=$1, reward_type=$2, description=$3, value=$4, date_given=$5, referral_source=$6, notes=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [referrer_name, reward_type, description, value, date_given, referral_source, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM referral_rewards WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
