const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM centers_of_influence ORDER BY influence_score DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM centers_of_influence WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, email, phone, company, industry, influence_score, network_size, relationship_status, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO centers_of_influence (name, email, phone, company, industry, influence_score, network_size, relationship_status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, email, phone, company, industry, influence_score || 5, network_size || 0, relationship_status || 'warm', notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, email, phone, company, industry, influence_score, network_size, relationship_status, notes } = req.body;
    const result = await pool.query(
      `UPDATE centers_of_influence SET name=$1, email=$2, phone=$3, company=$4, industry=$5, influence_score=$6, network_size=$7, relationship_status=$8, notes=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [name, email, phone, company, industry, influence_score, network_size, relationship_status, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM centers_of_influence WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
