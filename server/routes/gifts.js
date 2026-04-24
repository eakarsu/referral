const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM gifts_thanks ORDER BY date_sent DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM gifts_thanks WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { recipient_name, gift_type, description, cost, date_sent, occasion, response_received, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO gifts_thanks (recipient_name, gift_type, description, cost, date_sent, occasion, response_received, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [recipient_name, gift_type, description, cost || 0, date_sent, occasion, response_received || false, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { recipient_name, gift_type, description, cost, date_sent, occasion, response_received, notes } = req.body;
    const result = await pool.query(
      `UPDATE gifts_thanks SET recipient_name=$1, gift_type=$2, description=$3, cost=$4, date_sent=$5, occasion=$6, response_received=$7, notes=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [recipient_name, gift_type, description, cost, date_sent, occasion, response_received, notes, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM gifts_thanks WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
