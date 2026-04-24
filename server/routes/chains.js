const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM referral_chains ORDER BY total_value DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM referral_chains WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { chain_name, origin_contact, chain_links, total_value, total_referrals, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO referral_chains (chain_name, origin_contact, chain_links, total_value, total_referrals, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [chain_name, origin_contact, chain_links, total_value || 0, total_referrals || 0, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { chain_name, origin_contact, chain_links, total_value, total_referrals, notes } = req.body;
    const result = await pool.query(
      `UPDATE referral_chains SET chain_name=$1, origin_contact=$2, chain_links=$3, total_value=$4, total_referrals=$5, notes=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [chain_name, origin_contact, chain_links, total_value, total_referrals, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM referral_chains WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
