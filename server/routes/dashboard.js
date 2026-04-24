const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/stats', auth, async (req, res) => {
  try {
    const [contacts, referrals, clients, influencers, chains, gifts, stories, profiles, testimonials, nurturing, expectations, rewards, pipeline] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM contacts'),
      pool.query('SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as total_value FROM referrals'),
      pool.query('SELECT COUNT(*) as count, COALESCE(SUM(lifetime_value), 0) as total_value FROM clients'),
      pool.query('SELECT COUNT(*) as count FROM centers_of_influence'),
      pool.query('SELECT COUNT(*) as count, COALESCE(SUM(total_value), 0) as total_value FROM referral_chains'),
      pool.query('SELECT COUNT(*) as count, COALESCE(SUM(cost), 0) as total_cost FROM gifts_thanks'),
      pool.query('SELECT COUNT(*) as count FROM client_stories'),
      pool.query('SELECT COUNT(*) as count FROM ideal_client_profiles'),
      pool.query('SELECT COUNT(*) as count FROM testimonials'),
      pool.query('SELECT COUNT(*) as count FROM relationship_nurturing'),
      pool.query('SELECT COUNT(*) as count FROM expectations'),
      pool.query('SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as total_value FROM referral_rewards'),
      pool.query('SELECT COUNT(*) as count, COALESCE(SUM(estimated_value), 0) as total_value FROM referral_pipeline'),
    ]);

    res.json({
      contacts: { count: parseInt(contacts.rows[0].count) },
      referrals: { count: parseInt(referrals.rows[0].count), totalValue: parseFloat(referrals.rows[0].total_value) },
      clients: { count: parseInt(clients.rows[0].count), totalValue: parseFloat(clients.rows[0].total_value) },
      influencers: { count: parseInt(influencers.rows[0].count) },
      chains: { count: parseInt(chains.rows[0].count), totalValue: parseFloat(chains.rows[0].total_value) },
      gifts: { count: parseInt(gifts.rows[0].count), totalCost: parseFloat(gifts.rows[0].total_cost) },
      stories: { count: parseInt(stories.rows[0].count) },
      idealProfiles: { count: parseInt(profiles.rows[0].count) },
      testimonials: { count: parseInt(testimonials.rows[0].count) },
      nurturing: { count: parseInt(nurturing.rows[0].count) },
      expectations: { count: parseInt(expectations.rows[0].count) },
      rewards: { count: parseInt(rewards.rows[0].count), totalValue: parseFloat(rewards.rows[0].total_value) },
      pipeline: { count: parseInt(pipeline.rows[0].count), totalValue: parseFloat(pipeline.rows[0].total_value) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
