const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

async function callOpenRouter(messages, systemPrompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'Referral Mastery App'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: 1500
    })
  });
  const data = await response.json();
  return data;
}

// AI Referral Coach
router.post('/coach', auth, async (req, res) => {
  try {
    const { question, context } = req.body;
    const systemPrompt = `You are an expert referral coach based on Patrick Bet-David's referral mastery principles. You help users master the 13 key principles of referrals:
1. Manage expectations upfront
2. Water relationships continuously
3. Go above and beyond
4. Be patient with relationship building
5. Deepen relationships (cold → warm → hot)
6. Focus on centers of influence
7. Use client stories effectively
8. Give referrals first
9. Reward referrers meaningfully
10. Know your ideal client
11. Give options to help (reviews, testimonials)
12. Say thank you properly
13. Surprise with thoughtful gifts

Also help with Finders (generate opportunities), Closers (convert them), and Builders (deepen relationships). Provide actionable, specific advice. Format your response with clear sections using markdown.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `${context ? 'Context: ' + context + '\n\n' : ''}${question}` }],
      systemPrompt
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Email Generator for referral outreach
router.post('/generate-email', auth, async (req, res) => {
  try {
    const { recipient_name, relationship_type, purpose, tone } = req.body;
    const systemPrompt = `You are an expert at crafting referral-related emails. Generate professional, warm, and effective emails for referral outreach, thank you notes, follow-ups, and introductions. Keep emails concise but impactful. Format with clear subject line and body.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Write a ${tone || 'professional'} email to ${recipient_name} (${relationship_type || 'business contact'}) for the purpose of: ${purpose}` }],
      systemPrompt
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Relationship Analysis
router.post('/analyze-relationship', auth, async (req, res) => {
  try {
    const { contact_data } = req.body;
    const systemPrompt = `You are a relationship intelligence analyst. Analyze contact and relationship data to provide insights on how to strengthen the relationship, identify referral opportunities, and suggest next actions. Use Patrick Bet-David's referral principles. Format with clear sections: Relationship Score, Strengths, Opportunities, Recommended Actions.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Analyze this relationship data and provide actionable insights:\n${JSON.stringify(contact_data, null, 2)}` }],
      systemPrompt
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Gift Suggestion
router.post('/suggest-gift', auth, async (req, res) => {
  try {
    const { recipient_name, relationship, occasion, budget, interests } = req.body;
    const systemPrompt = `You are a thoughtful gift advisor specializing in business relationship gifts. Based on Patrick Bet-David's principle of surprising with thoughtful gifts on non-traditional days, suggest personalized, memorable gifts that deepen business relationships. Provide 3-5 suggestions with estimated costs and why each would be impactful.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Suggest gifts for ${recipient_name}. Relationship: ${relationship}. Occasion: ${occasion || 'no special occasion - surprise gift'}. Budget: ${budget || 'flexible'}. Their interests: ${interests || 'unknown'}.` }],
      systemPrompt
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Referral Script Generator
router.post('/generate-script', auth, async (req, res) => {
  try {
    const { scenario, client_type, goal } = req.body;
    const systemPrompt = `You are a referral conversation expert. Generate natural, effective scripts for asking for referrals based on Patrick Bet-David's principles. Include the setup, the ask, handling common objections, and follow-up. Make scripts feel natural, not salesy. Format with clear sections: Opening, The Ask, If They Say Yes, If They Hesitate, Follow-Up.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Generate a referral script for this scenario: ${scenario}. Client type: ${client_type || 'existing client'}. Goal: ${goal || 'get 2-3 warm introductions'}` }],
      systemPrompt
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Strategy Advisor
router.post('/strategy', auth, async (req, res) => {
  try {
    const { business_info, current_challenges, goals } = req.body;
    const systemPrompt = `You are a referral strategy consultant who applies Patrick Bet-David's referral mastery framework. Analyze the business situation and provide a comprehensive referral strategy including: identifying finders/closers/builders, prioritizing centers of influence, client segmentation (best/good/rest), and a 90-day action plan. Be specific and actionable.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Business: ${business_info}\nCurrent challenges: ${current_challenges}\nGoals: ${goals}` }],
      systemPrompt
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Follow-Up Message Generator
router.post('/follow-up', auth, async (req, res) => {
  try {
    const { contact_name, meeting_type, key_topics, next_steps, tone } = req.body;
    const systemPrompt = `You are an expert at writing follow-up messages that strengthen relationships and move referral conversations forward. Based on Patrick Bet-David's principle of watering relationships, write follow-up messages that add value, reference specific discussion points, and naturally set up future referral opportunities. Provide the message in a ready-to-send format with subject line.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Write a ${tone || 'warm and professional'} follow-up message to ${contact_name} after a ${meeting_type || 'business meeting'}. Key topics discussed: ${key_topics}. Agreed next steps: ${next_steps || 'none specified'}` }],
      systemPrompt
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Objection Handler
router.post('/handle-objection', auth, async (req, res) => {
  try {
    const { objection, relationship_context, your_service } = req.body;
    const systemPrompt = `You are a referral objection handling expert trained in Patrick Bet-David's methods. When someone hesitates to give referrals, you know exactly how to respond with empathy, provide alternatives (reviews, testimonials, introductions), and turn objections into opportunities. For each objection, provide: 1) Why they're saying this, 2) The ideal response word-for-word, 3) Alternative asks if they still hesitate, 4) How to preserve the relationship regardless. Be natural and never pushy.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `The objection I'm facing: "${objection}"\nRelationship context: ${relationship_context || 'existing client'}\nMy service: ${your_service || 'not specified'}` }],
      systemPrompt
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Networking Event Prep
router.post('/event-prep', auth, async (req, res) => {
  try {
    const { event_name, event_type, attendees, your_goals, your_business } = req.body;
    const systemPrompt = `You are a networking and referral event strategist. Help prepare for networking events using Patrick Bet-David's framework of Finders, Closers, and Builders. Provide: 1) Pre-event research checklist, 2) Conversation starters tailored to the event, 3) How to identify centers of influence at the event, 4) A referral-oriented elevator pitch, 5) Follow-up strategy for contacts made, 6) How to be a "Finder" at this event. Be specific and actionable.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Event: ${event_name || 'networking event'}\nType: ${event_type || 'business networking'}\nExpected attendees: ${attendees || 'various business professionals'}\nMy goals: ${your_goals || 'make valuable connections and identify referral partners'}\nMy business: ${your_business || 'not specified'}` }],
      systemPrompt
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Client Segmentation Advisor
router.post('/segment-clients', auth, async (req, res) => {
  try {
    const { client_list } = req.body;

    // If no client list provided, fetch from database
    let clientData = client_list;
    if (!clientData) {
      const dbClients = await pool.query('SELECT name, company, tier, lifetime_value, last_contact, notes FROM clients ORDER BY lifetime_value DESC');
      clientData = JSON.stringify(dbClients.rows, null, 2);
    }

    const systemPrompt = `You are a client segmentation expert using Patrick Bet-David's Best/Good/Rest framework. Analyze the client list and provide:
1) **Recommended Tier Changes** - Which clients should be upgraded or downgraded and why
2) **Hidden Gems** - Clients in lower tiers with high referral potential
3) **At-Risk Relationships** - Clients who may need immediate attention
4) **Referral Readiness Score** - Rate each client's likelihood to give referrals (1-10)
5) **Priority Action Plan** - Top 5 actions to take this week
6) **Revenue Opportunity** - Estimated additional revenue from better segmentation
Be data-driven and specific.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Analyze and segment these clients using the Best/Good/Rest framework:\n${clientData}` }],
      systemPrompt
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Relationship Health Score
router.post('/relationship-health', auth, async (req, res) => {
  try {
    const { contact_name, interactions, last_contact, referrals_exchanged, gifts_sent, notes } = req.body;
    const systemPrompt = `You are a relationship health diagnostic expert. Evaluate the health of a business relationship on a scale of 1-100 and provide:
1) **Overall Health Score** with a visual indicator (use emoji: 🟢 >80, 🟡 50-80, 🔴 <50)
2) **Relationship Stage** (Cold/Warming/Warm/Hot/Champion)
3) **Strengths** - What's working well
4) **Warning Signs** - Red flags or neglected areas
5) **Deepening Plan** - 5 specific actions to move the relationship to the next level
6) **Referral Readiness** - Is this person ready to refer? If not, what's needed?
7) **Recommended Touchpoint Schedule** - How often and what type of contact
Use Patrick Bet-David's principle of watering relationships. Be specific and actionable.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Evaluate the health of my relationship with ${contact_name}.\nRecent interactions: ${interactions || 'not specified'}\nLast contact: ${last_contact || 'unknown'}\nReferrals exchanged: ${referrals_exchanged || '0'}\nGifts/thank yous sent: ${gifts_sent || '0'}\nAdditional notes: ${notes || 'none'}` }],
      systemPrompt
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Thank You Note Writer
router.post('/thank-you-note', auth, async (req, res) => {
  try {
    const { recipient_name, what_to_thank, relationship_depth, delivery_method, personal_details } = req.body;
    const systemPrompt = `You are a master of gratitude and appreciation in business relationships. Based on Patrick Bet-David's principle of saying thank you properly and never taking introductions for granted, write heartfelt, genuine thank you notes that strengthen relationships. Provide:
1) A primary thank you note (ready to send)
2) A shorter alternative version
3) Suggested timing for delivery
4) Optional: a gift pairing suggestion that would complement the note
Make it personal, specific, and genuine — never generic or templated-feeling.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Write a thank you note to ${recipient_name} for: ${what_to_thank}.\nRelationship depth: ${relationship_depth || 'professional contact'}\nDelivery method: ${delivery_method || 'handwritten note'}\nPersonal details I know about them: ${personal_details || 'none specified'}` }],
      systemPrompt
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI LinkedIn Message Generator
router.post('/linkedin-message', auth, async (req, res) => {
  try {
    const { recipient_name, recipient_role, connection_type, purpose, mutual_connections } = req.body;
    const systemPrompt = `You are a LinkedIn messaging expert who specializes in building referral relationships through social media. Write LinkedIn messages that are:
- Short (under 300 characters for connection requests, under 500 for InMails)
- Personal and specific (not generic templates)
- Value-first (lead with what you can offer, not what you want)
- Referral-oriented (plant seeds for future referral conversations)
Provide: 1) Connection request message, 2) Follow-up message after they accept, 3) Value-add message to share a week later, 4) The referral conversation opener. Each should feel natural and human.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Write LinkedIn messages to ${recipient_name} (${recipient_role || 'professional'}).\nConnection type: ${connection_type || 'new connection'}\nPurpose: ${purpose || 'build referral relationship'}\nMutual connections: ${mutual_connections || 'unknown'}` }],
      systemPrompt
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Elevator Pitch Creator
router.post('/elevator-pitch', auth, async (req, res) => {
  try {
    const { your_business, target_audience, unique_value, ideal_client, key_results } = req.body;
    const systemPrompt = `You are an elevator pitch expert who creates pitches designed to generate referrals. Based on Patrick Bet-David's principle of knowing your ideal client so people know exactly who to introduce you to, create pitches that:
1) Clearly communicate who you help and how
2) Make it easy for listeners to think of someone to refer
3) Include a "trigger phrase" that makes your ideal client identifiable
Provide: 1) 15-second pitch, 2) 30-second pitch, 3) 60-second pitch, 4) The referral trigger phrase, 5) Follow-up question to ask after delivering the pitch, 6) Adaptations for 3 different audiences. Make each feel conversational, not rehearsed.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Create elevator pitches for my business.\nBusiness: ${your_business}\nTarget audience: ${target_audience || 'business professionals'}\nUnique value: ${unique_value || 'not specified'}\nIdeal client: ${ideal_client || 'not specified'}\nKey results achieved: ${key_results || 'not specified'}` }],
      systemPrompt
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Quarterly Review Generator
router.post('/quarterly-review', auth, async (req, res) => {
  try {
    const { period } = req.body;

    // Fetch data from database for review
    const [refCount, clientCount, giftCount, nurtureCount, pipelineData] = await Promise.all([
      pool.query('SELECT COUNT(*) as count, COALESCE(SUM(value),0) as total FROM referrals'),
      pool.query('SELECT tier, COUNT(*) as count FROM clients GROUP BY tier'),
      pool.query('SELECT COUNT(*) as count, COALESCE(SUM(cost),0) as total FROM gifts_thanks'),
      pool.query('SELECT COUNT(*) as count FROM relationship_nurturing WHERE status = $1', ['active']),
      pool.query('SELECT stage, COUNT(*) as count, COALESCE(SUM(estimated_value),0) as value FROM referral_pipeline GROUP BY stage'),
    ]);

    const dbSummary = {
      referrals: { count: refCount.rows[0].count, totalValue: refCount.rows[0].total },
      clientTiers: clientCount.rows,
      gifts: { count: giftCount.rows[0].count, totalInvested: giftCount.rows[0].total },
      activeNurturing: nurtureCount.rows[0].count,
      pipeline: pipelineData.rows,
    };

    const systemPrompt = `You are a referral business review analyst. Generate a comprehensive quarterly review using Patrick Bet-David's referral mastery framework. Include:
1) **Executive Summary** - Key wins and areas for improvement
2) **Referral Metrics** - Analysis of referral volume, value, and conversion
3) **Client Relationship Health** - Overview of Best/Good/Rest distribution
4) **Relationship Investment ROI** - Return on gifts, nurturing activities
5) **Pipeline Analysis** - Stage distribution and projected revenue
6) **Top Performer Recognition** - Acknowledge best referral partners
7) **Improvement Areas** - Which of the 13 principles need more attention
8) **Next Quarter Goals** - 5 SMART goals for next quarter
9) **Action Items** - Prioritized list of immediate actions
Use the data provided to give specific, data-driven insights.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Generate a quarterly review for ${period || 'this quarter'}.\n\nDatabase metrics:\n${JSON.stringify(dbSummary, null, 2)}` }],
      systemPrompt
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Introduction Facilitator
router.post('/facilitate-intro', auth, async (req, res) => {
  try {
    const { person_a_name, person_a_context, person_b_name, person_b_context, reason_for_intro, your_relationship_to_both } = req.body;
    const systemPrompt = `You are an expert at facilitating warm introductions — a key skill in Patrick Bet-David's referral framework. Making great introductions is how you become a valuable "Finder." Provide:
1) **Pre-Introduction Message to Person A** - Ask permission and set context
2) **Pre-Introduction Message to Person B** - Ask permission and set context
3) **The Double-Opt-In Introduction Email** - Connect both parties with context
4) **Why This Introduction Works** - The mutual value proposition
5) **Follow-Up Plan** - How to check in with both parties after
6) **Do's and Don'ts** for this specific introduction
Make all messages feel personal and high-value, not transactional.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Help me facilitate an introduction.\nPerson A: ${person_a_name} - ${person_a_context}\nPerson B: ${person_b_name} - ${person_b_context}\nReason for intro: ${reason_for_intro}\nMy relationship to both: ${your_relationship_to_both || 'professional contact'}` }],
      systemPrompt
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Contact Sync Assistant - help map external CRM/email contact dumps into the referral schema
router.post('/contact-sync-assistant', auth, async (req, res) => {
  try {
    const { source, sampleRecord, targetSchema } = req.body;
    if (!sampleRecord) {
      return res.status(400).json({ error: 'sampleRecord is required' });
    }
    const systemPrompt = `You assist with importing contacts into a referral relationship platform. Given a sample external record and the target schema, propose a field mapping, deduplication strategy, and data-quality issues. Output sections: Field Mapping, Required Transformations, Likely Duplicates Strategy, Data Quality Concerns, Suggested Default Values. Output as plain text with clear section headers.`;
    const result = await callOpenRouter(
      [{ role: 'user', content: `Source: ${source || 'unspecified'}\nSample Record:\n${JSON.stringify(sampleRecord, null, 2)}\nTarget Schema:\n${JSON.stringify(targetSchema || { contacts: ['name', 'email', 'phone', 'relationship', 'tags'] }, null, 2)}` }],
      systemPrompt
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Network Health Analyzer - assess overall network strength and surface gaps
router.post('/network-health-analyzer', auth, async (req, res) => {
  try {
    const { contacts, recentInteractions, goals } = req.body;
    const systemPrompt = `You are a relationship strategist applying Patrick Bet-David's referral principles. Assess the user's overall network health (breadth, depth, recency, diversity) and surface gaps relative to their goals. Output sections: Health Score (0-100 with reasoning), Strengths, Gaps, Top 5 Reactivation Targets, 30-Day Action Plan.`;
    const result = await callOpenRouter(
      [{ role: 'user', content: `Goals: ${goals || 'general referral growth'}\nContacts (${(contacts || []).length} total):\n${JSON.stringify((contacts || []).slice(0, 50), null, 2)}\nRecent Interactions:\n${JSON.stringify((recentInteractions || []).slice(0, 50), null, 2)}` }],
      systemPrompt
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// AI Referral Source Attribution - analyze closed deals/referrals to attribute and rank sources
router.post('/referral-source-attribution', auth, async (req, res) => {
  try {
    const { referrals, deals, period } = req.body;
    const systemPrompt = `You analyze referral source performance. Given referral and closed-deal data, attribute revenue/value to sources, rank them, identify patterns (best-performing relationship types, response times, conversion lags), and suggest where to invest more. Output sections: Top Sources Ranked, Key Patterns, Underperforming Sources, Recommended Investments, Suggested Tracking Improvements.`;
    const result = await callOpenRouter(
      [{ role: 'user', content: `Period: ${period || 'last 90 days'}\nReferrals (${(referrals || []).length}):\n${JSON.stringify((referrals || []).slice(0, 100), null, 2)}\nDeals (${(deals || []).length}):\n${JSON.stringify((deals || []).slice(0, 100), null, 2)}` }],
      systemPrompt
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
