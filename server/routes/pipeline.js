const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM referral_pipeline ORDER BY stage ASC, created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM referral_pipeline WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { prospect_name, company, source, stage, estimated_value, probability, expected_close, assigned_to, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO referral_pipeline (prospect_name, company, source, stage, estimated_value, probability, expected_close, assigned_to, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [prospect_name, company, source, stage || 'lead', estimated_value || 0, probability || 0, expected_close, assigned_to, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { prospect_name, company, source, stage, estimated_value, probability, expected_close, assigned_to, notes } = req.body;
    const result = await pool.query(
      `UPDATE referral_pipeline SET prospect_name=$1, company=$2, source=$3, stage=$4, estimated_value=$5, probability=$6, expected_close=$7, assigned_to=$8, notes=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [prospect_name, company, source, stage, estimated_value, probability, expected_close, assigned_to, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM referral_pipeline WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
