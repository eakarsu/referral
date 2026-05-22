const express = require('express');

const router = express.Router();

router.post('/score', (req, res) => {
  const partners = Array.isArray(req.body?.partners)
    ? req.body.partners
    : [
        { name: 'Jordan', asks30d: 6, referrals90d: 1, thankYous90d: 0 },
        { name: 'Avery', asks30d: 2, referrals90d: 4, thankYous90d: 3 },
      ];
  const scored = partners.map((partner) => {
    const fatigue = Math.min(100, Math.max(0, Number(partner.asks30d || 0) * 16 - Number(partner.referrals90d || 0) * 9 - Number(partner.thankYous90d || 0) * 6));
    return {
      name: partner.name || 'Partner',
      fatigue,
      action: fatigue >= 65 ? 'pause asks and send value touch' : fatigue >= 35 ? 'ask softly with specific fit' : 'healthy for direct ask',
    };
  });
  res.json({ scored, pauseCount: scored.filter((row) => row.fatigue >= 65).length });
});

module.exports = router;
