const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM testimonials ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM testimonials WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { client_name, company, testimonial_text, rating, type, is_public, date_received } = req.body;
    const result = await pool.query(
      `INSERT INTO testimonials (client_name, company, testimonial_text, rating, type, is_public, date_received)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [client_name, company, testimonial_text, rating || 5, type || 'written', is_public || true, date_received]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { client_name, company, testimonial_text, rating, type, is_public, date_received } = req.body;
    const result = await pool.query(
      `UPDATE testimonials SET client_name=$1, company=$2, testimonial_text=$3, rating=$4, type=$5, is_public=$6, date_received=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [client_name, company, testimonial_text, rating, type, is_public, date_received, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM testimonials WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
