const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ideal_client_profiles ORDER BY priority ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ideal_client_profiles WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { profile_name, industry, company_size, revenue_range, job_titles, pain_points, ideal_outcome, priority, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO ideal_client_profiles (profile_name, industry, company_size, revenue_range, job_titles, pain_points, ideal_outcome, priority, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [profile_name, industry, company_size, revenue_range, job_titles, pain_points, ideal_outcome, priority || 1, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { profile_name, industry, company_size, revenue_range, job_titles, pain_points, ideal_outcome, priority, notes } = req.body;
    const result = await pool.query(
      `UPDATE ideal_client_profiles SET profile_name=$1, industry=$2, company_size=$3, revenue_range=$4, job_titles=$5, pain_points=$6, ideal_outcome=$7, priority=$8, notes=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [profile_name, industry, company_size, revenue_range, job_titles, pain_points, ideal_outcome, priority, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM ideal_client_profiles WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
