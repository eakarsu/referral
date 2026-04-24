import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { post } from '../api';

const aiTools = [
  {
    id: 'coach',
    label: 'Referral Coach',
    icon: '🎓',
    desc: 'Get expert advice on referral strategies based on PBD\'s 13 principles',
    category: 'Strategy',
    endpoint: '/ai/coach',
    fields: [
      { key: 'question', label: 'Your Question', type: 'textarea', placeholder: 'e.g., How do I ask for referrals from a new client without being pushy?' },
      { key: 'context', label: 'Additional Context (optional)', type: 'textarea', placeholder: 'e.g., I work in financial services and the client signed up 3 months ago...' },
    ],
    sampleData: [
      { label: 'New Client Referral Ask', data: { question: 'How do I ask a brand new client for referrals without seeming desperate or pushy? They just signed up 2 weeks ago.', context: 'I run a financial advisory firm. This client came through a Google ad, not a referral. They invested $250K with us.' } },
      { label: 'Reactivate Old Contacts', data: { question: 'I have about 50 contacts I haven\'t spoken to in over a year. How do I reconnect and restart the referral conversation without it being awkward?', context: 'I\'m in commercial real estate. Many of these contacts were warm leads that went cold during the pandemic.' } },
      { label: 'Competing for Referrals', data: { question: 'My competitor in the same industry is getting more referrals than me despite my clients being happier. What am I doing wrong?', context: 'I\'m an insurance agent with 200+ clients. My NPS score is 85 but I only get about 2 referrals per month.' } },
    ],
  },
  {
    id: 'strategy',
    label: 'Strategy Advisor',
    icon: '📊',
    desc: 'Get a comprehensive referral strategy with 90-day action plan',
    category: 'Strategy',
    endpoint: '/ai/strategy',
    fields: [
      { key: 'business_info', label: 'Your Business', type: 'textarea', placeholder: 'e.g., B2B SaaS company serving mid-market finance teams, 50 current clients...' },
      { key: 'current_challenges', label: 'Current Challenges', type: 'textarea', placeholder: 'e.g., getting referrals from happy clients, identifying centers of influence...' },
      { key: 'goals', label: 'Goals', type: 'textarea', placeholder: 'e.g., generate 20 new referrals per month, build partnerships with 5 CPAs...' },
    ],
    sampleData: [
      { label: 'Financial Advisory Firm', data: { business_info: 'Boutique financial advisory firm with 85 active clients and $120M AUM. Team of 4 advisors. Average client has been with us 3.5 years. We specialize in business owners and executives with $1M+ investable assets.', current_challenges: 'Only 15% of our new clients come from referrals. Happy clients say nice things but rarely introduce anyone. We don\'t have a systematic referral process. Our advisors feel uncomfortable asking.', goals: 'Increase referral-sourced new clients to 50% within 6 months. Build partnerships with 10 CPAs and 5 estate attorneys. Generate at least 8 qualified referrals per month.' } },
      { label: 'SaaS Startup', data: { business_info: 'B2B SaaS platform for HR teams, $3M ARR, 120 customers ranging from 50 to 5000 employees. Product-led growth model but want to add referral channel. Founded 3 years ago.', current_challenges: 'No referral program exists. Customers love the product (4.8 stars on G2) but we\'ve never systematically asked for referrals. Don\'t know who our centers of influence are in the HR tech space.', goals: 'Launch a referral program that generates 20 qualified demos per month. Identify and partner with 15 HR consultants as referral sources. Reduce CAC by 40% through referral-driven growth.' } },
      { label: 'Real Estate Agent', data: { business_info: 'Solo real estate agent in Austin, TX. 5 years experience, closed 28 homes last year averaging $450K. 70% of business is buyers, 30% sellers. Strong on Zillow reviews (4.9 stars, 95 reviews).', current_challenges: 'Most leads come from Zillow and Realtor.com which are expensive. Past clients love me but I lose touch after closing. I don\'t have a CRM for staying in contact. No referral partnerships with lenders or inspectors.', goals: 'Get 50% of business from referrals within 12 months. Build referral partnerships with 3 lenders, 2 title companies, and 2 home inspectors. Create a past-client nurturing system that generates 3 referrals per month.' } },
    ],
  },
  {
    id: 'quarterly',
    label: 'Quarterly Review',
    icon: '📋',
    desc: 'Auto-generate a data-driven quarterly review from your database metrics',
    category: 'Strategy',
    endpoint: '/ai/quarterly-review',
    fields: [
      { key: 'period', label: 'Review Period', type: 'text', placeholder: 'e.g., Q1 2024, January-March 2024' },
    ],
    sampleData: [
      { label: 'Q1 2024 Review', data: { period: 'Q1 2024 (January - March 2024)' } },
      { label: 'Q4 2023 Review', data: { period: 'Q4 2023 (October - December 2023)' } },
      { label: 'H1 2024 Review', data: { period: 'First Half 2024 (January - June 2024)' } },
    ],
  },
  {
    id: 'segment',
    label: 'Client Segmentation',
    icon: '🏷️',
    desc: 'AI analyzes your client list and recommends Best/Good/Rest tier changes',
    category: 'Strategy',
    endpoint: '/ai/segment-clients',
    fields: [
      { key: 'client_list', label: 'Client Details (leave empty to auto-fetch from database)', type: 'textarea', placeholder: 'Optional: paste client data here, or leave empty to analyze your database clients automatically' },
    ],
    sampleData: [
      { label: 'Auto-Analyze My Database', data: { client_list: '' } },
      { label: 'Sample Insurance Clients', data: { client_list: '1. Johnson Family - Life & Auto, $4,200/yr premium, 8 years client, referred 6 people, always renews early\n2. Tech Startup Corp - Commercial liability only, $12,000/yr, 1 year client, no referrals, slow to respond\n3. Maria Santos - Home & Auto, $2,800/yr, 3 years, referred 2 people, very engaged\n4. Big Box Retail LLC - Workers comp + liability, $45,000/yr, 5 years, never refers, threatens to leave annually\n5. Dr. Smith Practice - Professional liability, $8,500/yr, 2 years, referred 1 person, asks lots of questions\n6. Green Valley HOA - Property insurance, $15,000/yr, 4 years, board president refers constantly, 9 referrals\n7. Mike\'s Auto Shop - Commercial auto + liability, $6,200/yr, 6 months, no referrals yet, great rapport\n8. Riverside Church - Property + liability bundle, $3,400/yr, 7 years, pastor refers occasionally, 4 referrals' } },
      { label: 'Sample Consulting Clients', data: { client_list: '1. Acme Manufacturing - Operations consulting, $180K/yr, 4 years, CFO is a champion, 5 referrals generated\n2. StartupXYZ - Growth strategy, $45K project, 6 months, CEO loves us but small network\n3. MegaCorp Industries - Digital transformation, $500K/yr, 2 years, slow to pay, 0 referrals, bureaucratic\n4. Family Office Smith - Investment advisory, $120K/yr, 5 years, patriarch is a super-connector, 12 referrals\n5. Regional Bank Co - Risk consulting, $95K/yr, 3 years, compliance officer very satisfied, 3 referrals\n6. HealthCo Systems - IT consulting, $200K/yr, 1 year, CTO is new, relationship still forming\n7. Law Firm Partners LLP - Business development, $60K/yr, 2 years, managing partner refers other lawyers, 7 referrals' } },
    ],
  },
  {
    id: 'email',
    label: 'Email Generator',
    icon: '✉️',
    desc: 'Generate professional referral outreach emails',
    category: 'Communication',
    endpoint: '/ai/generate-email',
    fields: [
      { key: 'recipient_name', label: 'Recipient Name', type: 'text', placeholder: 'John Smith' },
      { key: 'relationship_type', label: 'Relationship Type', type: 'text', placeholder: 'e.g., existing client, center of influence, new contact' },
      { key: 'purpose', label: 'Email Purpose', type: 'textarea', placeholder: 'e.g., Thank them for a referral and ask if they know anyone else who could benefit' },
      { key: 'tone', label: 'Tone', type: 'select', options: ['professional', 'warm', 'casual', 'formal'] },
    ],
    sampleData: [
      { label: 'Thank You for Referral', data: { recipient_name: 'Lisa Park', relationship_type: 'Top referral partner of 2 years, insurance VP', purpose: 'Thank her for referring the Johnson family last week. They just signed up for a full financial plan worth $8,500/year. I want to express genuine gratitude and subtly let her know I\'m always happy to help anyone she sends my way.', tone: 'warm' } },
      { label: 'Ask CPA for Partnership', data: { recipient_name: 'Patricia Hernandez', relationship_type: 'CPA I met at a chamber event 3 months ago, had coffee once', purpose: 'Propose a mutual referral partnership. I\'m a financial advisor and she\'s a CPA with 500+ small business clients. I want to suggest we meet quarterly to exchange referrals and explore how we can serve each other\'s clients better.', tone: 'professional' } },
      { label: 'Reconnect with Old Client', data: { recipient_name: 'David Martinez', relationship_type: 'Former client from 2 years ago who moved to a different provider', purpose: 'Reconnect after 2 years without being salesy. I heard through mutual contacts that his current provider isn\'t great. I want to check in genuinely, offer value, and see if there\'s an opportunity to work together again.', tone: 'casual' } },
    ],
  },
  {
    id: 'follow-up',
    label: 'Follow-Up Writer',
    icon: '📨',
    desc: 'Generate perfect follow-up messages after meetings or events',
    category: 'Communication',
    endpoint: '/ai/follow-up',
    fields: [
      { key: 'contact_name', label: 'Contact Name', type: 'text', placeholder: 'Jane Doe' },
      { key: 'meeting_type', label: 'Meeting/Event Type', type: 'text', placeholder: 'e.g., coffee meeting, conference, phone call, lunch' },
      { key: 'key_topics', label: 'Key Topics Discussed', type: 'textarea', placeholder: 'e.g., their expansion plans, mutual interest in fintech, their need for marketing help...' },
      { key: 'next_steps', label: 'Agreed Next Steps', type: 'textarea', placeholder: 'e.g., send proposal by Friday, introduce to my contact at XYZ Corp' },
      { key: 'tone', label: 'Tone', type: 'select', options: ['warm and professional', 'casual', 'formal', 'enthusiastic'] },
    ],
    sampleData: [
      { label: 'After Coffee Meeting', data: { contact_name: 'Warren Mitchell', meeting_type: 'Coffee meeting at Starbucks downtown', key_topics: 'His new venture capital fund focusing on fintech startups. He mentioned needing help with due diligence on financial projections. We talked about our mutual connection Sarah Chen. He shared that he\'s looking for a trusted financial advisor to recommend to his portfolio companies.', next_steps: 'I\'ll send him the fintech market report I mentioned. He\'ll introduce me to two of his portfolio company CEOs next month.', tone: 'warm and professional' } },
      { label: 'After Conference Panel', data: { contact_name: 'Angela Foster', meeting_type: 'Industry conference - we were both panelists at the Real Estate Investment Summit', key_topics: 'She shared insights about luxury real estate trends. We discovered we both serve high-net-worth clients in the same area. She mentioned her clients often need financial planning and estate planning help. I mentioned my clients often need real estate guidance for investment properties.', next_steps: 'Schedule a lunch meeting next week to discuss a formal referral partnership. She\'ll send me her client demographic overview.', tone: 'enthusiastic' } },
      { label: 'After Phone Call', data: { contact_name: 'James Wilson', meeting_type: 'Scheduled 30-minute phone call', key_topics: 'Quarterly check-in on our mutual referral partnership. He sent me 4 referrals last quarter, I sent him 2. We need to even out the exchange. He mentioned a new compliance requirement affecting his financial advisory clients that I might be able to help with.', next_steps: 'I\'ll send him 3 potential referrals from my client list by Friday. He\'ll send me the compliance requirement details so I can prepare a solution overview.', tone: 'warm and professional' } },
    ],
  },
  {
    id: 'thank-you',
    label: 'Thank You Notes',
    icon: '💌',
    desc: 'Write heartfelt, personalized thank you notes that strengthen bonds',
    category: 'Communication',
    endpoint: '/ai/thank-you-note',
    fields: [
      { key: 'recipient_name', label: 'Recipient Name', type: 'text', placeholder: 'Sarah Chen' },
      { key: 'what_to_thank', label: 'What to Thank Them For', type: 'textarea', placeholder: 'e.g., referring 3 new clients to me this quarter, introducing me to their CPA...' },
      { key: 'relationship_depth', label: 'Relationship Depth', type: 'select', options: ['new connection', 'professional contact', 'trusted partner', 'close friend/mentor'] },
      { key: 'delivery_method', label: 'Delivery Method', type: 'select', options: ['handwritten note', 'email', 'text message', 'LinkedIn message', 'card with gift'] },
      { key: 'personal_details', label: 'Personal Details You Know', type: 'textarea', placeholder: 'e.g., they love golf, just had a baby, moving to a new office...' },
    ],
    sampleData: [
      { label: 'Referral Partner Milestone', data: { recipient_name: 'Lisa Park', what_to_thank: 'She just sent her 50th referral to our firm over the past 3 years. This latest referral — the Henderson family — just signed a $500K investment account. Lisa has single-handedly been responsible for over $2M in new business.', relationship_depth: 'close friend/mentor', delivery_method: 'card with gift', personal_details: 'She loves Italian cooking, her daughter just got into USC, she\'s training for her first half marathon in April, and she just redecorated her office.' } },
      { label: 'First Referral from New Contact', data: { recipient_name: 'Dr. Michael Chen', what_to_thank: 'He referred his colleague Dr. Sarah Williams to me for retirement planning. It\'s the first referral he\'s ever sent me — we only met 4 months ago at a medical conference.', relationship_depth: 'professional contact', delivery_method: 'handwritten note', personal_details: 'He\'s a cardiologist, just published a research paper, has two kids in middle school, and is a big Warriors fan.' } },
      { label: 'Mentor Who Opened Doors', data: { recipient_name: 'Pastor Mike Johnson', what_to_thank: 'For introducing me to Sarah Chen 5 years ago — that single introduction has generated over $50 million in business and completely changed the trajectory of my career and company. I want to reflect on this anniversary.', relationship_depth: 'close friend/mentor', delivery_method: 'card with gift', personal_details: 'He\'s been pastoring for 30 years, loves fishing, his wife just retired from teaching, and he\'s writing a book about community leadership.' } },
    ],
  },
  {
    id: 'linkedin',
    label: 'LinkedIn Messages',
    icon: '💼',
    desc: 'Generate a full LinkedIn messaging sequence to build referral relationships',
    category: 'Communication',
    endpoint: '/ai/linkedin-message',
    fields: [
      { key: 'recipient_name', label: 'Recipient Name', type: 'text', placeholder: 'Marcus Chen' },
      { key: 'recipient_role', label: 'Their Role/Title', type: 'text', placeholder: 'e.g., VP of Sales at Tech Corp, CPA, Real Estate Broker' },
      { key: 'connection_type', label: 'Connection Type', type: 'select', options: ['new connection', '2nd degree', 'met at event', 'mutual connection', 'former colleague'] },
      { key: 'purpose', label: 'Purpose', type: 'textarea', placeholder: 'e.g., explore mutual referral partnership, reconnect, build relationship' },
      { key: 'mutual_connections', label: 'Mutual Connections', type: 'text', placeholder: 'e.g., Lisa Park, David Martinez' },
    ],
    sampleData: [
      { label: 'Connect with CPA', data: { recipient_name: 'Rebecca Torres', recipient_role: 'Managing Partner at Torres & Associates CPA Firm, specializes in small business tax strategy', connection_type: '2nd degree', purpose: 'Build a mutual referral partnership. I\'m a financial advisor and her small business clients often need investment and retirement planning. I want to explore how we can help each other\'s clients.', mutual_connections: 'Patricia Hernandez, Warren Mitchell' } },
      { label: 'Reconnect After Event', data: { recipient_name: 'Kevin O\'Brien', recipient_role: 'VP of Business Development at Meridian Insurance Group', connection_type: 'met at event', purpose: 'We briefly spoke at the Chamber of Commerce gala last week. He mentioned his company is looking for financial advisors to partner with for their commercial clients\' benefits packages. I want to continue that conversation.', mutual_connections: 'Raymond Brooks (Chamber President)' } },
      { label: 'Reach Industry Leader', data: { recipient_name: 'Diana Ross-Clark', recipient_role: 'Founder & GP at Ross-Clark Ventures, VC fund focused on B2B SaaS', connection_type: 'new connection', purpose: 'She invests in B2B startups and her portfolio companies need financial advisory services as they scale. I want to position myself as the go-to advisor she recommends to her portfolio companies.', mutual_connections: 'None — cold outreach based on her recent Forbes interview about supporting portfolio company founders' } },
    ],
  },
  {
    id: 'script',
    label: 'Referral Scripts',
    icon: '📝',
    desc: 'Generate natural referral conversation scripts with objection handling',
    category: 'Sales',
    endpoint: '/ai/generate-script',
    fields: [
      { key: 'scenario', label: 'Scenario', type: 'textarea', placeholder: 'e.g., Client just renewed their annual contract and expressed satisfaction...' },
      { key: 'client_type', label: 'Client Type', type: 'text', placeholder: 'e.g., long-term client, new client, center of influence' },
      { key: 'goal', label: 'Goal', type: 'text', placeholder: 'e.g., get 2-3 warm introductions to CFOs in manufacturing' },
    ],
    sampleData: [
      { label: 'After Annual Review', data: { scenario: 'Just completed a very successful annual financial review with the Hendersons. Their portfolio is up 18% this year, we helped them save $12K in taxes with a Roth conversion strategy, and they mentioned they feel "so relieved" to have a great advisor. They are clearly delighted.', client_type: 'Long-term client of 4 years, husband is a VP at a manufacturing company', goal: 'Get 2-3 warm introductions to other executives at his company or in his industry who might need financial planning' } },
      { label: 'New Client Onboarding', data: { scenario: 'Just finished the onboarding process for a new client. We set up their investment accounts, created their financial plan, and handled a rollover from their old 401k. The process took 3 weeks and they said it was "the smoothest experience they\'ve ever had with a financial firm."', client_type: 'Brand new client (3 weeks), came through a Google search, software engineer at a tech company', goal: 'Plant the seed for future referrals without being pushy. Set the expectation that we grow through referrals.' } },
      { label: 'Center of Influence Meeting', data: { scenario: 'Monthly lunch with my CPA referral partner Patricia. She\'s sent me 8 referrals this year and I\'ve sent her 3. She mentioned she just onboarded 15 new small business clients this tax season and several of them need financial planning.', client_type: 'Center of influence — CPA with 500+ clients, strong referral partner for 2 years', goal: 'Get her to introduce me to 3-5 of her new small business clients who need financial planning, and offer to send her more referrals in return' } },
    ],
  },
  {
    id: 'objection',
    label: 'Objection Handler',
    icon: '🛡️',
    desc: 'Get word-for-word responses for common referral objections',
    category: 'Sales',
    endpoint: '/ai/handle-objection',
    fields: [
      { key: 'objection', label: 'The Objection You\'re Facing', type: 'textarea', placeholder: 'e.g., "I don\'t really know anyone who needs your service", "Let me think about it", "I don\'t like giving out people\'s info"' },
      { key: 'relationship_context', label: 'Relationship Context', type: 'text', placeholder: 'e.g., 2-year client, new client (3 months), center of influence' },
      { key: 'your_service', label: 'Your Service/Product', type: 'text', placeholder: 'e.g., financial planning, insurance, IT consulting' },
    ],
    sampleData: [
      { label: '"I Don\'t Know Anyone"', data: { objection: 'I don\'t really know anyone who needs your service right now. Let me think about it and get back to you.', relationship_context: '3-year client, very happy with our service, but always says this when I ask for referrals. He\'s a sales VP at a company with 200 employees.', your_service: 'Financial planning and wealth management for high-income professionals' } },
      { label: '"I Don\'t Give Out Info"', data: { objection: 'I\'m not comfortable giving out my friends\' and colleagues\' contact information. I don\'t want them to feel like I\'m selling them something.', relationship_context: 'New client of 6 months, loves our work, gave us a 5-star review. She\'s a doctor in a large medical practice.', your_service: 'Insurance and employee benefits consulting' } },
      { label: '"I Need to Think About It"', data: { objection: 'That\'s a great question. Let me think about who might be a good fit and I\'ll get back to you. (They never get back to me — this has happened 5 times.)', relationship_context: 'Center of influence — a business attorney I\'ve known for 2 years. He says he\'ll refer but never follows through despite a warm relationship.', your_service: 'Business consulting and fractional CFO services' } },
      { label: '"Your Competitor Is Cheaper"', data: { objection: 'I would refer you but honestly your fees are higher than competitors. I don\'t want to refer someone and then have them come back to me saying it\'s too expensive.', relationship_context: '5-year client who stays because of the relationship but acknowledges we\'re not the cheapest option.', your_service: 'IT managed services and cybersecurity' } },
    ],
  },
  {
    id: 'pitch',
    label: 'Elevator Pitch',
    icon: '🎤',
    desc: 'Create elevator pitches that make people want to refer you',
    category: 'Sales',
    endpoint: '/ai/elevator-pitch',
    fields: [
      { key: 'your_business', label: 'Your Business', type: 'textarea', placeholder: 'e.g., We help mid-market SaaS companies reduce customer churn by 40%...' },
      { key: 'target_audience', label: 'Target Audience', type: 'text', placeholder: 'e.g., B2B SaaS founders, CFOs, small business owners' },
      { key: 'unique_value', label: 'Unique Value Proposition', type: 'textarea', placeholder: 'e.g., We\'re the only firm that combines data analytics with hands-on account management...' },
      { key: 'ideal_client', label: 'Ideal Client Description', type: 'text', placeholder: 'e.g., SaaS company with $5-50M ARR and 500+ customers' },
      { key: 'key_results', label: 'Key Results Achieved', type: 'textarea', placeholder: 'e.g., Reduced churn by 40% for 3 clients, saved $2M in annual revenue for ABC Corp...' },
    ],
    sampleData: [
      { label: 'Financial Advisor', data: { your_business: 'Independent financial advisory firm specializing in helping business owners build wealth, protect their families, and plan for succession. We manage $120M in assets for 85 families.', target_audience: 'Business owners with $1M+ revenue, executives at mid-size companies, professionals earning $300K+', unique_value: 'Unlike big wirehouses, we act as a personal CFO — handling investments, tax strategy, estate planning, and business succession all under one roof. We limit our practice to 100 families so every client gets white-glove attention.', ideal_client: 'Business owner with $1M-$10M in revenue, personally earning $300K+, concerned about taxes, business succession, and making sure their family is protected', key_results: 'Saved clients an average of $47K per year in taxes through proactive planning. Helped 12 business owners successfully transition their businesses. Average client has been with us 6+ years with 95% retention rate.' } },
      { label: 'Marketing Agency', data: { your_business: 'Digital marketing agency focused on professional services firms — we help lawyers, CPAs, and financial advisors get more high-value clients through content marketing, SEO, and LinkedIn strategies.', target_audience: 'Partners at law firms, CPAs, financial advisors, consultants', unique_value: 'We only work with professional services firms so we deeply understand compliance requirements, long sales cycles, and the trust-based nature of these businesses. We\'re not generalists.', ideal_client: 'Professional services firm with 5-50 employees, $2M-$20M revenue, that relies on referrals but wants to add a digital channel', key_results: 'Helped a 15-person law firm increase qualified leads by 340% in 12 months. Generated $2.8M in new business for a CPA firm through LinkedIn thought leadership. Average ROI for our clients is 8x.' } },
      { label: 'IT Consulting', data: { your_business: 'Managed IT services and cybersecurity firm. We handle everything from helpdesk support to advanced threat protection for small and mid-size businesses who can\'t afford a full IT department.', target_audience: 'CEOs and operations managers at companies with 20-200 employees', unique_value: 'We assign a dedicated team to each client — not a rotating cast of techs. Our 15-minute response time guarantee is backed by a money-back SLA. We also include cybersecurity awareness training for all employees.', ideal_client: 'Company with 20-200 employees, no internal IT team (or just 1 overwhelmed person), in a regulated industry like healthcare, finance, or legal', key_results: 'Reduced security incidents by 94% for a 150-person medical practice. Cut IT costs by 35% for a regional bank while improving uptime to 99.99%. Zero clients have experienced a data breach in 5 years.' } },
    ],
  },
  {
    id: 'event',
    label: 'Event Prep',
    icon: '🎪',
    desc: 'Prepare talking points and referral strategies for networking events',
    category: 'Networking',
    endpoint: '/ai/event-prep',
    fields: [
      { key: 'event_name', label: 'Event Name', type: 'text', placeholder: 'e.g., Chamber of Commerce Annual Gala, BNI Meeting, Industry Conference' },
      { key: 'event_type', label: 'Event Type', type: 'select', options: ['conference', 'networking mixer', 'industry dinner', 'BNI/referral group', 'trade show', 'charity gala', 'seminar/workshop'] },
      { key: 'attendees', label: 'Expected Attendees', type: 'textarea', placeholder: 'e.g., 200 local business owners, mostly real estate and finance professionals...' },
      { key: 'your_goals', label: 'Your Goals for This Event', type: 'textarea', placeholder: 'e.g., meet 5 potential referral partners, identify 2 centers of influence, reconnect with Lisa Park...' },
      { key: 'your_business', label: 'Your Business (for context)', type: 'text', placeholder: 'e.g., Financial advisory firm specializing in business owners' },
    ],
    sampleData: [
      { label: 'Chamber of Commerce Gala', data: { event_name: 'Austin Chamber of Commerce Annual Business Awards Gala', event_type: 'charity gala', attendees: 'About 300 local business owners, executives, and community leaders. The mayor will be there. Mix of real estate, finance, healthcare, and technology professionals. Several past clients will be attending. Raymond Brooks (chamber president) personally invited me and offered to make introductions.', your_goals: 'Meet 3 potential center-of-influence partners (specifically targeting CPAs and attorneys). Reconnect with 5 past clients I haven\'t spoken to in months. Get introduced to the new hospital network CEO. Position myself as a thought leader by asking good questions during the awards Q&A.', your_business: 'Financial advisory firm managing $120M for 85 families, specializing in business owners and executives' } },
      { label: 'BNI Chapter Meeting', data: { event_name: 'BNI Power Players Chapter - Weekly Meeting', event_type: 'BNI/referral group', attendees: '25 members: 1 realtor, 1 mortgage broker, 1 CPA, 1 attorney, 1 insurance agent, 1 chiropractor, 1 marketing consultant, 1 IT specialist, and others. New visitor: a commercial real estate developer. I need to give my 60-second pitch and provide a referral to another member.', your_goals: 'Deliver a compelling 60-second pitch focused on a specific referral trigger. Give a quality referral to the CPA. Ask the group to look for business owners going through succession planning. Connect with the new commercial developer visitor after the meeting.', your_business: 'Fractional CFO and business consulting for companies with $2M-$20M revenue' } },
      { label: 'Industry Conference', data: { event_name: 'FinTech Forward 2024 Conference', event_type: 'conference', attendees: 'About 2,000 attendees. Mix of fintech startup founders, VCs, bank executives, financial advisors, and tech vendors. I\'m not speaking but my client Diana Ross-Clark is on a panel about the future of wealth management technology.', your_goals: 'Support Diana at her panel and meet 3-5 people she introduces me to afterward. Identify fintech startups that might need financial advisory services. Attend the "Future of Referrals in Financial Services" breakout session. Collect 15 business cards and have meaningful conversations with at least 5 potential referral partners.', your_business: 'Wealth management firm that specializes in tech executives and startup founders' } },
    ],
  },
  {
    id: 'intro',
    label: 'Introduction Facilitator',
    icon: '🤝',
    desc: 'Craft perfect double-opt-in introductions between two contacts',
    category: 'Networking',
    endpoint: '/ai/facilitate-intro',
    fields: [
      { key: 'person_a_name', label: 'Person A - Name', type: 'text', placeholder: 'Sarah Chen' },
      { key: 'person_a_context', label: 'Person A - Context', type: 'textarea', placeholder: 'e.g., CEO of Tech Ventures, looking for a CPA who understands SaaS metrics...' },
      { key: 'person_b_name', label: 'Person B - Name', type: 'text', placeholder: 'Patricia Hernandez' },
      { key: 'person_b_context', label: 'Person B - Context', type: 'textarea', placeholder: 'e.g., CPA specializing in tech companies, wants to grow her SaaS client base...' },
      { key: 'reason_for_intro', label: 'Why This Introduction', type: 'textarea', placeholder: 'e.g., Both would benefit from working together — Sarah needs a tech-savvy CPA, Patricia wants more SaaS clients' },
      { key: 'your_relationship_to_both', label: 'Your Relationship to Both', type: 'text', placeholder: 'e.g., Sarah is a 3-year client, Patricia is in my BNI group' },
    ],
    sampleData: [
      { label: 'CEO Meets CPA', data: { person_a_name: 'Sarah Chen', person_a_context: 'CEO of Tech Ventures Inc, a $15M SaaS company. She\'s frustrated with her current CPA who doesn\'t understand SaaS metrics like MRR, churn, and CAC. She needs someone who can help with R&D tax credits and stock option planning for her 40 employees.', person_b_name: 'Patricia Hernandez', person_b_context: 'Managing partner at Hernandez CPA Firm. She recently completed specialized training in SaaS accounting and is actively looking to grow her tech client base. She already serves 12 tech companies and understands GAAP for software companies.', reason_for_intro: 'Perfect match — Sarah needs exactly what Patricia specializes in. Patricia has been telling me she wants more SaaS clients. This could be a $50K+ annual engagement for Patricia and would solve Sarah\'s biggest operational pain point.', your_relationship_to_both: 'Sarah has been my financial advisory client for 3 years. Patricia is in my BNI chapter and has sent me 8 referrals.' } },
      { label: 'Startup Meets VC', data: { person_a_name: 'James Wilson', person_a_context: 'Founder of FinWise Analytics, a B2B fintech startup with $800K ARR and 45 clients. Currently raising a $3M seed round. Product-market fit is strong with 150% net revenue retention. First-time founder, Stanford MBA.', person_b_name: 'Diana Ross-Clark', person_b_context: 'General Partner at Ross-Clark Ventures, a $50M fund focused on B2B fintech. She\'s looking for seed-stage investments in companies with proven PMF and strong unit economics. She typically writes $500K-$2M checks.', reason_for_intro: 'James fits Diana\'s investment thesis perfectly — B2B fintech with strong retention metrics. Diana told me last week she\'s looking for exactly this type of deal. This could be a career-changing funding round for James.', your_relationship_to_both: 'James is a financial planning client and I\'ve watched his startup grow for 2 years. Diana is a long-time client and center of influence who I meet quarterly.' } },
      { label: 'Realtor Meets Attorney', data: { person_a_name: 'Angela Foster', person_a_context: 'Top-producing luxury real estate agent in Austin. Sells $50M+ per year. Her high-net-worth clients frequently need estate planning and asset protection when buying investment properties. She\'s tired of recommending generic attorneys.', person_b_name: 'Marcus Chen', person_b_context: 'Partner at Chen & Associates, specializing in real estate law, estate planning, and asset protection for HNWI. He recently expanded his practice and wants to build referral partnerships with luxury realtors. Known for exceptional client service.', reason_for_intro: 'Angela\'s clients need Marcus\'s exact services, and Marcus wants exactly the type of referral partner Angela would be. Both serve HNWI in Austin. This could be a long-term, high-value referral partnership for both.', your_relationship_to_both: 'Angela has referred 8 clients to my wealth management practice. Marcus is my business attorney and has handled several deals for me.' } },
    ],
  },
  {
    id: 'analyze',
    label: 'Relationship Analyzer',
    icon: '🔍',
    desc: 'Get AI insights on how to strengthen any relationship',
    category: 'Analysis',
    endpoint: '/ai/analyze-relationship',
    fields: [
      { key: 'contact_data', label: 'Relationship Details', type: 'textarea', placeholder: 'Describe the contact: name, how you met, relationship history, last interaction, what value you\'ve provided...' },
    ],
    transform: (data) => ({ contact_data: data.contact_data }),
    sampleData: [
      { label: 'Stalling Referral Partner', data: { contact_data: 'Name: Robert Thompson, Founder of Media Growth Agency. Met him 18 months ago through a mutual friend. He has a large social media following (200K on LinkedIn, 150K on YouTube). We\'ve had 4 coffee meetings, I sent him 2 referrals (he closed 1), he sent me 1 referral. Our last meeting was 2 months ago. He seems interested in partnering but never follows through on commitments. He\'s always "busy." I sent him a holiday gift (nice bottle of wine, $80) and he texted thanks but didn\'t reciprocate. He has connections to major influencers and media personalities that could be very valuable to my business.' } },
      { label: 'High-Value but Distant Client', data: { contact_data: 'Name: Jennifer Williams, Managing Director at Capital Partners LLC. She\'s been a client for 5 years with $2M invested with our firm. She referred us to one major investor 3 years ago (worth $5M in business) but hasn\'t referred anyone since. Our interactions are limited to quarterly portfolio reviews — always professional, never personal. She\'s very private and all-business. She seems satisfied with our performance (portfolio up 45% over 5 years) but shows no emotional engagement. She\'s extremely well-connected in the private equity world.' } },
      { label: 'Enthusiastic but No Results', data: { contact_data: 'Name: Amanda Lopez, Creative Director at Lopez Marketing Group. We met at a networking event 8 months ago and hit it off immediately. She\'s incredibly enthusiastic about referring me — she says "I\'m going to send you so many clients!" at every meeting. We\'ve had 6 coffee meetings, 3 phone calls, and she comments on all my LinkedIn posts. She gave me a glowing testimonial. But in 8 months, she hasn\'t actually sent a single referral. She knows lots of people (2,500 LinkedIn connections, active in 3 business groups). I\'ve sent her 2 referrals and she closed both.' } },
    ],
  },
  {
    id: 'health',
    label: 'Relationship Health',
    icon: '💓',
    desc: 'Get a health score for any relationship with specific improvement actions',
    category: 'Analysis',
    endpoint: '/ai/relationship-health',
    fields: [
      { key: 'contact_name', label: 'Contact Name', type: 'text', placeholder: 'Lisa Park' },
      { key: 'interactions', label: 'Recent Interactions', type: 'textarea', placeholder: 'e.g., Monthly coffee meetings, she sent 3 referrals last month, we co-hosted a webinar...' },
      { key: 'last_contact', label: 'Last Contact Date', type: 'text', placeholder: 'e.g., 2 weeks ago, January 15, yesterday' },
      { key: 'referrals_exchanged', label: 'Referrals Exchanged', type: 'text', placeholder: 'e.g., She sent 12 referrals, I sent 5 to her' },
      { key: 'gifts_sent', label: 'Gifts/Thank Yous Sent', type: 'text', placeholder: 'e.g., 3 gifts this year, handwritten notes quarterly' },
      { key: 'notes', label: 'Additional Notes', type: 'textarea', placeholder: 'e.g., she seems less engaged lately, she got promoted, she mentioned wanting more business...' },
    ],
    sampleData: [
      { label: 'Thriving Partnership', data: { contact_name: 'Lisa Park', interactions: 'Monthly coffee meetings (never missed in 2 years). She sent 4 referrals last month. We co-hosted a client appreciation dinner last quarter. She invited me to her company retreat as a guest speaker. I helped her daughter with college essay review. We text casually about once a week.', last_contact: '3 days ago - quick text about a new restaurant', referrals_exchanged: 'She has sent 48 referrals total (I\'ve closed 35). I have sent her 22 referrals (she\'s closed 15). Very balanced and mutual.', gifts_sent: 'Restaurant gift card for her 50th referral milestone ($200). Handwritten thank you notes quarterly. Spa gift for her birthday. Personalized golf bag tag (she recently took up golf).', notes: 'This is my best referral relationship. She recently got promoted to VP of Sales. Wondering if I should do something special to celebrate and ensure the relationship stays strong during her transition.' } },
      { label: 'Cooling Off Relationship', data: { contact_name: 'Chris Taylor', interactions: 'Used to meet monthly for lunch but our last 3 scheduled meetings got canceled (twice by him, once by me). He responded to my last email 5 days late with a short "sounds good." We haven\'t had a real conversation in 6 weeks.', last_contact: '6 weeks ago - a brief email reply', referrals_exchanged: 'He sent 5 referrals in our first year but only 1 in the last 6 months. I\'ve sent him 3 referrals in total, 2 of which he closed.', gifts_sent: 'Noise-canceling headphones for Christmas (he travels a lot). One handwritten note 4 months ago. Nothing since.', notes: 'He hired a new associate at his consulting firm and seems overwhelmed. He may be going through some personal stuff too — he was recently divorced. I don\'t want to lose this relationship but I\'m not sure how to re-engage without being pushy.' } },
      { label: 'New But Promising', data: { contact_name: 'Sandra Kim', interactions: 'Met 3 months ago at a banking industry event. Had one coffee meeting where we talked for 2 hours. She\'s a commercial banker with access to every growing business in the area. She seemed very interested in partnering. I sent her one referral (a client who needed a business loan) which she closed.', last_contact: '2 weeks ago - LinkedIn comment on her post', referrals_exchanged: 'I sent 1 referral (she closed it). She hasn\'t sent me any yet but mentioned she has "several clients who need financial planning."', gifts_sent: 'None yet', notes: 'Very high potential — she manages 200+ commercial banking relationships. She mentioned she\'s never had a financial advisor she truly trusts to recommend. This could be huge but I need to move carefully. She seems to value competence over charm.' } },
    ],
  },
  {
    id: 'gift',
    label: 'Gift Advisor',
    icon: '🎁',
    desc: 'Get personalized gift suggestions to deepen relationships',
    category: 'Relationship Building',
    endpoint: '/ai/suggest-gift',
    fields: [
      { key: 'recipient_name', label: 'Recipient Name', type: 'text', placeholder: 'Jane Doe' },
      { key: 'relationship', label: 'Relationship', type: 'text', placeholder: 'e.g., top referral partner for 2 years' },
      { key: 'occasion', label: 'Occasion', type: 'text', placeholder: 'e.g., random surprise, 10th referral milestone, just because' },
      { key: 'budget', label: 'Budget', type: 'text', placeholder: 'e.g., $100-$300' },
      { key: 'interests', label: 'Their Interests', type: 'textarea', placeholder: 'e.g., golf, fine wine, travel, cooking...' },
    ],
    sampleData: [
      { label: 'Random Tuesday Surprise', data: { recipient_name: 'Warren Mitchell', relationship: 'Center of influence in financial services, knows everyone in town. Has sent 15 referrals over 3 years. Very successful, has everything money can buy.', occasion: 'No special occasion — want to surprise him on a random Tuesday per PBD\'s principle of surprising with thoughtful gifts on non-traditional days', budget: '$200-$500', interests: 'He\'s a history buff (especially WWII), collects rare whiskeys, loves deep-sea fishing, recently started learning to play piano, and is an avid reader of biographies.' } },
      { label: 'New Baby Celebration', data: { recipient_name: 'Emily Davis', relationship: 'Startup accelerator director, relatively new relationship (6 months), has introduced me to 3 startup founders', occasion: 'She just had her first baby — a girl named Sophia. I want to send something thoughtful that stands out from the generic baby gifts she\'ll receive from everyone else.', budget: '$100-$200', interests: 'She\'s a tech entrepreneur at heart, loves hiking and outdoor activities, big fan of sustainable/eco-friendly products, and she and her husband are foodies who love trying new restaurants.' } },
      { label: '100th Referral Milestone', data: { recipient_name: 'Rachel Green', relationship: 'Wealth management partner, our most prolific referral source ever. She just sent her 100th referral to our firm over 5 years. Together we\'ve generated over $3M in mutual business.', occasion: 'Celebrating her 100th referral to our firm — a truly extraordinary milestone that deserves something exceptional', budget: '$500-$1000', interests: 'She runs marathons (completed 8), passionate about her children\'s education (two kids in private school), loves art and has a small collection of contemporary paintings, enjoys spa weekends, and recently started a charitable foundation focused on financial literacy for women.' } },
    ],
  },
];

const categories = ['Strategy', 'Communication', 'Sales', 'Networking', 'Analysis', 'Relationship Building'];

export default function AICoach() {
  const [activeTool, setActiveTool] = useState(null);
  const [formData, setFormData] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const tool = aiTools.find((t) => t.id === activeTool);
      const payload = tool.transform ? tool.transform(formData) : formData;
      const data = await post(tool.endpoint, payload);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to get AI response');
    } finally {
      setLoading(false);
    }
  };

  const getAIContent = () => {
    if (!result) return null;
    if (result.choices?.[0]?.message?.content) return result.choices[0].message.content;
    if (result.error) return `Error: ${result.error.message || JSON.stringify(result.error)}`;
    return JSON.stringify(result, null, 2);
  };

  const loadSample = (sampleObj) => {
    setFormData(sampleObj.data);
    setResult(null);
    setError('');
  };

  const filteredTools = activeCategory
    ? aiTools.filter((t) => t.category === activeCategory)
    : aiTools;

  const currentTool = aiTools.find((t) => t.id === activeTool);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold gradient-text">AI Referral Coach</h1>
        <p className="text-slate-400 mt-1">16 AI-powered tools to master referrals — Powered by OpenRouter</p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveCategory(null)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            !activeCategory ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          All ({aiTools.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeCategory === cat ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {cat} ({aiTools.filter((t) => t.category === cat).length})
          </button>
        ))}
      </div>

      {/* Tool Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
        {filteredTools.map((tool) => (
          <div
            key={tool.id}
            onClick={() => { setActiveTool(tool.id); setFormData({}); setResult(null); setError(''); }}
            className={`glass-card rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] ${
              activeTool === tool.id
                ? 'border-purple-500 shadow-lg shadow-purple-500/10'
                : 'hover-glow'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xl">{tool.icon}</span>
              <h3 className="text-white font-semibold text-sm">{tool.label}</h3>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">{tool.desc}</p>
            <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500">{tool.category}</span>
          </div>
        ))}
      </div>

      {/* Active Tool Form */}
      {activeTool && currentTool && (
        <div className="glass-card rounded-xl p-6 mb-6 border-purple-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{currentTool.icon}</span>
              <div>
                <h2 className="text-xl font-bold text-white">{currentTool.label}</h2>
                <p className="text-xs text-slate-500">{currentTool.desc}</p>
              </div>
            </div>
            <button onClick={() => { setActiveTool(null); setResult(null); }} className="text-slate-500 hover:text-white transition text-lg">✕</button>
          </div>

          {/* Sample Data Buttons */}
          {currentTool.sampleData && currentTool.sampleData.length > 0 && (
            <div className="mb-5 p-4 bg-slate-800/60 rounded-lg border border-slate-700">
              <p className="text-xs text-slate-400 mb-2.5 font-medium uppercase tracking-wide">Quick Fill with Sample Data</p>
              <div className="flex flex-wrap gap-2">
                {currentTool.sampleData.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => loadSample(sample)}
                    className="px-3.5 py-2 bg-gradient-to-r from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/50 hover:to-purple-600/50 text-indigo-300 hover:text-white rounded-lg text-xs font-medium transition-all border border-indigo-500/30 hover:border-indigo-400/50 hover:shadow-lg hover:shadow-indigo-500/10"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {currentTool.fields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm text-slate-400 mb-1">{field.label}</label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={formData[field.key] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500 transition placeholder-slate-500"
                    rows={3}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={formData[field.key] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500 transition"
                  >
                    <option value="">Select...</option>
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={formData[field.key] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500 transition placeholder-slate-500"
                  />
                )}
              </div>
            ))}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    AI is thinking...
                  </span>
                ) : 'Get AI Advice'}
              </button>
              <button
                type="button"
                onClick={() => setFormData({})}
                className="px-5 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition"
              >
                Clear Form
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="glass-card rounded-xl p-6 mb-6 border-red-500/50">
          <div className="flex items-center gap-2 text-red-400">
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* AI Response - Beautiful Professional Display */}
      {result && (
        <div className="glass-card rounded-xl overflow-hidden mb-6 border-purple-500/30">
          {/* Response Header */}
          <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 px-6 py-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-lg">🤖</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">AI Response</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>Model: {result.model || 'Claude Haiku 4.5'}</span>
                    <span>•</span>
                    <span>Tokens: {result.usage?.total_tokens || '—'}</span>
                    {result.usage?.total_tokens && (
                      <>
                        <span>•</span>
                        <span>Prompt: {result.usage.prompt_tokens} | Completion: {result.usage.completion_tokens}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  const content = getAIContent();
                  navigator.clipboard.writeText(content);
                }}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs transition flex items-center gap-1"
              >
                📋 Copy
              </button>
            </div>
          </div>
          {/* Response Body */}
          <div className="p-6">
            <div className="ai-response prose prose-invert max-w-none">
              <ReactMarkdown>{getAIContent()}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* 13 Principles Reference (shown when no tool is active) */}
      {!activeTool && !result && (
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-2">Patrick Bet-David's 13 Referral Principles</h2>
          <p className="text-slate-400 text-sm mb-4">Each AI tool above is designed around one or more of these principles</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { num: 1, text: 'Manage expectations upfront', tools: 'Referral Scripts, Strategy' },
              { num: 2, text: 'Water relationships continuously', tools: 'Follow-Up Writer, Relationship Health' },
              { num: 3, text: 'Go above and beyond', tools: 'Strategy Advisor, Client Segmentation' },
              { num: 4, text: 'Be patient with relationship building', tools: 'Relationship Health, Quarterly Review' },
              { num: 5, text: 'Deepen relationships (cold → warm → hot)', tools: 'Relationship Analyzer, LinkedIn Messages' },
              { num: 6, text: 'Focus on centers of influence', tools: 'Event Prep, Introduction Facilitator' },
              { num: 7, text: 'Use client stories effectively', tools: 'Elevator Pitch, Referral Coach' },
              { num: 8, text: 'Give referrals first', tools: 'Introduction Facilitator, Event Prep' },
              { num: 9, text: 'Reward referrers meaningfully', tools: 'Gift Advisor, Thank You Notes' },
              { num: 10, text: 'Know your ideal client', tools: 'Elevator Pitch, Client Segmentation' },
              { num: 11, text: 'Give options to help', tools: 'Objection Handler, Referral Scripts' },
              { num: 12, text: 'Say thank you properly', tools: 'Thank You Notes, Follow-Up Writer' },
              { num: 13, text: 'Surprise with thoughtful gifts', tools: 'Gift Advisor, Thank You Notes' },
            ].map((p) => (
              <div key={p.num} className="bg-slate-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-purple-400 font-bold text-sm">{p.num}.</span>
                  <span className="text-slate-200 text-sm font-medium">{p.text}</span>
                </div>
                <p className="text-slate-500 text-xs ml-5">Tools: {p.tools}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
