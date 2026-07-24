const express = require('express');
const auth = require('../middleware/auth');
const pool = require('../db');

const router = express.Router();

router.post('/referral-operations-review', auth, async (req, res, next) => {
  try {
    const prompt = String(req.body?.prompt || '').trim();
    if (!prompt || prompt.length > 4000) return res.status(400).json({ error: 'prompt must contain 1-4000 characters' });
    const baseUrl = String(process.env.OPENROUTER_BASE_URL || '').replace(/\/+$/, '');
    const apiKey = String(process.env.OPENROUTER_API_KEY || '').trim();
    const model = String(process.env.OPENROUTER_MODEL || '').trim();
    if (baseUrl !== 'https://openrouter.ai/api/v1' || !apiKey || !model) {
      return res.status(503).json({ error: 'Exact OpenRouter configuration is required' });
    }
    const providerResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'Referral operations review' },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'Review deidentified referral operations evidence for consent, attribution, handoff, outreach, suppression, and human-approval gaps. Do not invent evidence or authorize outreach.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 650,
      }),
      signal: AbortSignal.timeout(90_000),
    });
    const provider = await providerResponse.json().catch(() => ({}));
    const content = String(provider.choices?.[0]?.message?.content || '').trim();
    if (!providerResponse.ok || !provider.id || !content) throw new Error(`OpenRouter request failed with HTTP ${providerResponse.status}`);
    const providerReceipt = {
      requestId: String(provider.id),
      provider: String(provider.provider || 'openrouter'),
      upstreamModel: String(provider.model || model),
      created: Number(provider.created || 0),
    };
    const saved = await pool.query(
      'INSERT INTO runtime_ai_interactions(organization_id,user_id,feature,input,output,model,provider_receipt) VALUES($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7::jsonb) RETURNING id',
      [req.user.organizationId, req.user.id, 'referral-operations-review', JSON.stringify(req.body || {}), JSON.stringify({ content }), model, JSON.stringify(providerReceipt)]
    );
    const interactionId = Number(saved.rows[0]?.id);
    if (!Number.isSafeInteger(interactionId) || interactionId < 1) throw new Error('Persisted interaction identifier is invalid');
    res.json({ content, model, providerReceipt, interactionId, feature: 'referral-operations-review' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
