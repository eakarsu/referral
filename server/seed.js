const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'referral_mastery',
  user: process.env.DB_USER || process.env.USER,
};
if (process.env.DB_PASSWORD) {
  poolConfig.password = process.env.DB_PASSWORD;
}
const pool = new Pool(poolConfig);

async function seed() {
  console.log('🌱 Starting database seed...');

  // Create tables
  await pool.query(`
    DROP TABLE IF EXISTS referral_rewards CASCADE;
    DROP TABLE IF EXISTS referral_pipeline CASCADE;
    DROP TABLE IF EXISTS expectations CASCADE;
    DROP TABLE IF EXISTS relationship_nurturing CASCADE;
    DROP TABLE IF EXISTS testimonials CASCADE;
    DROP TABLE IF EXISTS ideal_client_profiles CASCADE;
    DROP TABLE IF EXISTS client_stories CASCADE;
    DROP TABLE IF EXISTS gifts_thanks CASCADE;
    DROP TABLE IF EXISTS referral_chains CASCADE;
    DROP TABLE IF EXISTS centers_of_influence CASCADE;
    DROP TABLE IF EXISTS referrals CASCADE;
    DROP TABLE IF EXISTS clients CASCADE;
    DROP TABLE IF EXISTS contacts CASCADE;
    DROP TABLE IF EXISTS users CASCADE;

    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE contacts (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      company VARCHAR(255),
      role VARCHAR(255),
      relationship_level VARCHAR(20) DEFAULT 'cold',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE referrals (
      id SERIAL PRIMARY KEY,
      referrer_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      referred_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
      status VARCHAR(50) DEFAULT 'pending',
      value DECIMAL(12,2) DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE clients (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      company VARCHAR(255),
      tier VARCHAR(20) DEFAULT 'good',
      lifetime_value DECIMAL(12,2) DEFAULT 0,
      last_contact DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE centers_of_influence (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      company VARCHAR(255),
      industry VARCHAR(255),
      influence_score INTEGER DEFAULT 5,
      network_size INTEGER DEFAULT 0,
      relationship_status VARCHAR(20) DEFAULT 'warm',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE referral_chains (
      id SERIAL PRIMARY KEY,
      chain_name VARCHAR(255) NOT NULL,
      origin_contact VARCHAR(255),
      chain_links TEXT,
      total_value DECIMAL(12,2) DEFAULT 0,
      total_referrals INTEGER DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE gifts_thanks (
      id SERIAL PRIMARY KEY,
      recipient_name VARCHAR(255) NOT NULL,
      gift_type VARCHAR(100),
      description TEXT,
      cost DECIMAL(10,2) DEFAULT 0,
      date_sent DATE,
      occasion VARCHAR(255),
      response_received BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE client_stories (
      id SERIAL PRIMARY KEY,
      client_name VARCHAR(255) NOT NULL,
      title VARCHAR(255),
      story TEXT,
      outcome TEXT,
      referrals_generated INTEGER DEFAULT 0,
      category VARCHAR(100),
      is_featured BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE ideal_client_profiles (
      id SERIAL PRIMARY KEY,
      profile_name VARCHAR(255) NOT NULL,
      industry VARCHAR(255),
      company_size VARCHAR(100),
      revenue_range VARCHAR(100),
      job_titles TEXT,
      pain_points TEXT,
      ideal_outcome TEXT,
      priority INTEGER DEFAULT 1,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE testimonials (
      id SERIAL PRIMARY KEY,
      client_name VARCHAR(255) NOT NULL,
      company VARCHAR(255),
      testimonial_text TEXT,
      rating INTEGER DEFAULT 5,
      type VARCHAR(50) DEFAULT 'written',
      is_public BOOLEAN DEFAULT true,
      date_received DATE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE relationship_nurturing (
      id SERIAL PRIMARY KEY,
      contact_name VARCHAR(255) NOT NULL,
      activity_type VARCHAR(100),
      description TEXT,
      last_interaction DATE,
      next_action_date DATE,
      frequency VARCHAR(50) DEFAULT 'monthly',
      status VARCHAR(50) DEFAULT 'active',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE expectations (
      id SERIAL PRIMARY KEY,
      client_name VARCHAR(255) NOT NULL,
      expectation_set TEXT,
      date_set DATE,
      response TEXT,
      follow_up_date DATE,
      status VARCHAR(50) DEFAULT 'set',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE referral_rewards (
      id SERIAL PRIMARY KEY,
      referrer_name VARCHAR(255) NOT NULL,
      reward_type VARCHAR(100),
      description TEXT,
      value DECIMAL(10,2) DEFAULT 0,
      date_given DATE,
      referral_source VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE referral_pipeline (
      id SERIAL PRIMARY KEY,
      prospect_name VARCHAR(255) NOT NULL,
      company VARCHAR(255),
      source VARCHAR(255),
      stage VARCHAR(50) DEFAULT 'lead',
      estimated_value DECIMAL(12,2) DEFAULT 0,
      probability INTEGER DEFAULT 0,
      expected_close DATE,
      assigned_to VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('✅ Tables created');

  // Seed user
  const hash = await bcrypt.hash(process.env.DEFAULT_PASSWORD || 'admin123', 10);
  await pool.query(`INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)`,
    ['Admin User', process.env.DEFAULT_EMAIL || 'admin@referralmastery.com', hash]);
  console.log('✅ User created');

  // Seed contacts (15 items)
  await pool.query(`
    INSERT INTO contacts (name, email, phone, company, role, relationship_level, notes) VALUES
    ('Pastor Mike Johnson', 'mike.j@faithcommunity.org', '555-0101', 'Faith Community Church', 'Senior Pastor', 'hot', 'Key connector who introduced me to my first business partners'),
    ('Sarah Chen', 'sarah@techventures.com', '555-0102', 'Tech Ventures Inc', 'CEO', 'hot', 'Met through Pastor Mike, became top performer in my organization'),
    ('David Martinez', 'david@martinezrealty.com', '555-0103', 'Martinez Realty Group', 'Broker', 'warm', 'Helped find office space, strong referral partner'),
    ('Jennifer Williams', 'jen@capitalpartners.com', '555-0104', 'Capital Partners LLC', 'Managing Director', 'hot', 'Major investor contact, brought in $5M series A'),
    ('Robert Thompson', 'rob@mediagrowth.com', '555-0105', 'Media Growth Agency', 'Founder', 'warm', 'Connected to influencer network, helped viral interview'),
    ('Lisa Park', 'lisa@insurancepro.com', '555-0106', 'Insurance Pro Solutions', 'VP Sales', 'hot', 'Top referral source, sends 3-4 referrals monthly'),
    ('Michael Brown', 'mbrown@brownlegal.com', '555-0107', 'Brown Legal Associates', 'Attorney', 'warm', 'Center of influence in business community'),
    ('Emily Davis', 'emily@startupaccel.com', '555-0108', 'Startup Accelerator', 'Program Director', 'cold', 'New connection through networking event'),
    ('James Wilson', 'james@financialwise.com', '555-0109', 'Financial Wise Advisors', 'Senior Advisor', 'hot', 'Mutual referral partnership, 20+ referrals exchanged'),
    ('Amanda Lopez', 'amanda@lopezgroup.com', '555-0110', 'Lopez Marketing Group', 'Creative Director', 'warm', 'Great at connecting people, wide network'),
    ('Chris Taylor', 'chris@taylorconsulting.com', '555-0111', 'Taylor Business Consulting', 'Principal', 'warm', 'Business strategy advisor, connected to C-suite executives'),
    ('Rachel Green', 'rachel@greenwealth.com', '555-0112', 'Green Wealth Management', 'CFP', 'hot', 'High-value referral partner in financial services'),
    ('Tom Anderson', 'tom@andersondev.com', '555-0113', 'Anderson Development', 'Developer', 'cold', 'Real estate developer, potential for large deals'),
    ('Nicole White', 'nicole@whitehr.com', '555-0114', 'White HR Solutions', 'HR Director', 'warm', 'Corporate contacts for employee benefits referrals'),
    ('Kevin Moore', 'kevin@mooremedia.com', '555-0115', 'Moore Media Productions', 'Producer', 'warm', 'Media connections for brand visibility and thought leadership')
  `);
  console.log('✅ Contacts seeded');

  // Seed referrals (15 items)
  await pool.query(`
    INSERT INTO referrals (referrer_id, referred_id, status, value, notes) VALUES
    (1, 2, 'closed', 2500000, 'Pastor Mike introduced Sarah who became our top revenue generator'),
    (2, 3, 'closed', 150000, 'Sarah connected us with David for office space and business referrals'),
    (2, 4, 'closed', 5000000, 'Sarah introduced Jennifer who led our Series A funding round'),
    (3, 5, 'closed', 350000, 'David connected with Robert for media exposure'),
    (5, 6, 'closed', 780000, 'Robert introduced Lisa who became a consistent referral partner'),
    (6, 7, 'closed', 120000, 'Lisa referred Michael for legal services and business connections'),
    (7, 8, 'pending', 0, 'Michael mentioned Emily startup accelerator program'),
    (6, 9, 'closed', 450000, 'Lisa connected with James for financial advisory partnerships'),
    (9, 10, 'in_progress', 75000, 'James introduced Amanda for marketing services'),
    (4, 11, 'closed', 200000, 'Jennifer connected with Chris for business consulting'),
    (11, 12, 'closed', 890000, 'Chris introduced Rachel for wealth management partnership'),
    (3, 13, 'pending', 500000, 'David connected with Tom for commercial development project'),
    (7, 14, 'in_progress', 95000, 'Michael referred Nicole for HR solutions partnerships'),
    (5, 15, 'closed', 180000, 'Robert introduced Kevin for media production collaboration'),
    (12, 1, 'closed', 300000, 'Full circle - Rachel referred back to Pastor Mike community')
  `);
  console.log('✅ Referrals seeded');

  // Seed clients (15 items)
  await pool.query(`
    INSERT INTO clients (name, email, phone, company, tier, lifetime_value, last_contact, notes) VALUES
    ('Acme Corporation', 'contact@acme.com', '555-1001', 'Acme Corp', 'best', 1250000, '2024-01-15', 'Enterprise client, 5 referrals generated. Always exceed expectations for them.'),
    ('BlueStar Industries', 'info@bluestar.com', '555-1002', 'BlueStar Industries', 'best', 890000, '2024-01-10', 'High-value manufacturing client, very connected in their industry'),
    ('Cascade Financial', 'hello@cascadefin.com', '555-1003', 'Cascade Financial', 'best', 750000, '2024-01-08', 'Financial services partner, source of 8 referrals last year'),
    ('DynaTech Solutions', 'sales@dynatech.com', '555-1004', 'DynaTech', 'good', 320000, '2024-01-05', 'Technology client, growing relationship'),
    ('EverGreen Properties', 'info@evergreenprops.com', '555-1005', 'EverGreen', 'good', 280000, '2023-12-20', 'Real estate client, potential for more business'),
    ('FrontLine Security', 'admin@frontlinesec.com', '555-1006', 'FrontLine Security', 'good', 195000, '2023-12-15', 'Security services, medium engagement'),
    ('Global Health Partners', 'info@globalhp.com', '555-1007', 'Global Health', 'best', 950000, '2024-01-12', 'Healthcare sector leader, strong advocate'),
    ('Harbor Logistics', 'ops@harborlog.com', '555-1008', 'Harbor Logistics', 'good', 175000, '2023-12-10', 'Logistics company, steady business'),
    ('Infinity Labs', 'research@infinitylabs.com', '555-1009', 'Infinity Labs', 'rest', 45000, '2023-11-15', 'R&D firm, minimal engagement so far'),
    ('Jupiter Marketing', 'hello@jupitermark.com', '555-1010', 'Jupiter Marketing', 'rest', 35000, '2023-11-01', 'Small marketing firm, occasional projects'),
    ('Keystone Architecture', 'design@keystonearch.com', '555-1011', 'Keystone Arch', 'good', 210000, '2023-12-18', 'Architecture firm with commercial clients'),
    ('Lighthouse Consulting', 'info@lighthousec.com', '555-1012', 'Lighthouse', 'best', 680000, '2024-01-14', 'Strategy consulting, many C-suite connections'),
    ('Meridian Insurance', 'agents@meridianins.com', '555-1013', 'Meridian Insurance', 'good', 245000, '2023-12-22', 'Insurance agency, growing partnership'),
    ('Nova Education', 'admin@novaedu.com', '555-1014', 'Nova Education', 'rest', 55000, '2023-10-30', 'Education sector, early stage relationship'),
    ('Olympus Capital', 'invest@olympuscap.com', '555-1015', 'Olympus Capital', 'best', 1100000, '2024-01-13', 'Investment firm, key referral source for high-net-worth clients')
  `);
  console.log('✅ Clients seeded');

  // Seed centers of influence (15 items)
  await pool.query(`
    INSERT INTO centers_of_influence (name, email, phone, company, industry, influence_score, network_size, relationship_status, notes) VALUES
    ('Warren Mitchell', 'warren@mitchellgroup.com', '555-2001', 'Mitchell Group', 'Finance', 10, 5000, 'hot', 'Top influencer in financial services, knows everyone worth knowing'),
    ('Diana Ross-Clark', 'diana@rossclark.com', '555-2002', 'Ross-Clark Ventures', 'Venture Capital', 9, 3500, 'hot', 'VC network leader, introduced to 20+ funded startups'),
    ('Marcus Chen', 'marcus@chenassoc.com', '555-2003', 'Chen & Associates', 'Legal', 9, 2800, 'warm', 'Business attorney with deep corporate connections'),
    ('Patricia Hernandez', 'patricia@hernandezcpa.com', '555-2004', 'Hernandez CPA Firm', 'Accounting', 8, 2200, 'hot', 'CPA with 500+ business clients, great referral partner'),
    ('Raymond Brooks', 'ray@brookschamber.com', '555-2005', 'Chamber of Commerce', 'Government', 9, 4000, 'warm', 'Chamber president, access to entire local business community'),
    ('Sandra Kim', 'sandra@kimbankgroup.com', '555-2006', 'Kim Banking Group', 'Banking', 8, 1800, 'hot', 'Commercial banker, knows every business owner in the area'),
    ('Theodore Grant', 'theo@grantmedia.com', '555-2007', 'Grant Media Empire', 'Media', 10, 8000, 'warm', 'Media mogul with massive audience reach'),
    ('Victoria Palmer', 'victoria@palmerhealth.com', '555-2008', 'Palmer Healthcare', 'Healthcare', 7, 1500, 'warm', 'Hospital network admin, healthcare sector connections'),
    ('William Drake', 'will@draketech.com', '555-2009', 'Drake Technologies', 'Technology', 8, 3000, 'hot', 'Tech entrepreneur, YC alumni network'),
    ('Angela Foster', 'angela@fosterrealestate.com', '555-2010', 'Foster Real Estate', 'Real Estate', 9, 2500, 'hot', 'Top realtor with client list of high-net-worth individuals'),
    ('Benjamin Hayes', 'ben@hayesinsurance.com', '555-2011', 'Hayes Insurance Group', 'Insurance', 7, 1200, 'warm', 'Insurance industry leader, BNI chapter president'),
    ('Catherine Long', 'catherine@longphilanthropy.org', '555-2012', 'Long Foundation', 'Nonprofit', 8, 3200, 'warm', 'Philanthropist connected to wealthy donor network'),
    ('Douglas Rivera', 'doug@riveraadvisors.com', '555-2013', 'Rivera Business Advisors', 'Consulting', 8, 2000, 'hot', 'Business advisor to Fortune 500 companies'),
    ('Elena Volkov', 'elena@volkovinternational.com', '555-2014', 'Volkov International', 'Import/Export', 7, 1800, 'cold', 'International business connections across Europe and Asia'),
    ('Franklin Pierce', 'frank@piercewealth.com', '555-2015', 'Pierce Wealth Advisory', 'Wealth Management', 9, 2800, 'hot', 'Manages $500M+ in assets, knows all major players')
  `);
  console.log('✅ Centers of influence seeded');

  // Seed referral chains (15 items)
  await pool.query(`
    INSERT INTO referral_chains (chain_name, origin_contact, chain_links, total_value, total_referrals, notes) VALUES
    ('The Pastor Chain', 'Pastor Mike Johnson', 'Pastor Mike → Sarah Chen → Jennifer Williams → $5M Investment', 50000000, 12, 'The original chain that generated $50M in value over 10 years'),
    ('Real Estate Pipeline', 'David Martinez', 'David → Tom Anderson → 3 Commercial Projects → 8 Investors', 8500000, 8, 'Commercial real estate referral network'),
    ('Media & Influence Chain', 'Robert Thompson', 'Robert → Kevin Moore → Viral Interview → 10M Views → Investors', 15000000, 6, 'Media exposure chain that drove major investment interest'),
    ('Financial Services Web', 'James Wilson', 'James → Rachel Green → 5 HNWI Clients → Estate Planning', 3200000, 15, 'Cross-referral network in financial services'),
    ('Legal Network', 'Michael Brown', 'Michael → 3 Law Firms → Corporate Clients → Compliance Work', 1800000, 9, 'Legal professional referral ecosystem'),
    ('Insurance Powerhouse', 'Lisa Park', 'Lisa → 4 Agencies → Employee Benefits → Group Plans', 4500000, 22, 'Insurance industry referral machine'),
    ('Tech Startup Pipeline', 'Emily Davis', 'Emily → Accelerator → 6 Startups → SaaS Contracts', 2100000, 11, 'Technology startup ecosystem referrals'),
    ('Healthcare Network', 'Victoria Palmer', 'Victoria → 3 Hospitals → Medical Suppliers → Admin Services', 1500000, 7, 'Healthcare industry referral chain'),
    ('Consulting Cascade', 'Chris Taylor', 'Chris → Douglas Rivera → Fortune 500 → Consulting Contracts', 5800000, 14, 'Business consulting referral network'),
    ('Wealth Management Circle', 'Franklin Pierce', 'Franklin → 8 HNWI → Family Offices → Private Equity', 12000000, 18, 'High-net-worth wealth management referral circle'),
    ('Chamber Connection', 'Raymond Brooks', 'Raymond → Chamber Events → 15 Local Businesses → Partnerships', 950000, 15, 'Local business community referral network'),
    ('Nonprofit Bridge', 'Catherine Long', 'Catherine → Foundation → Donors → Corporate Sponsorships', 2800000, 10, 'Nonprofit to corporate referral pathway'),
    ('Banking Bridge', 'Sandra Kim', 'Sandra → Business Loans → 10 Growing Companies → Services', 3500000, 12, 'Banking to business services referral chain'),
    ('International Trade', 'Elena Volkov', 'Elena → Import/Export → Distribution → Retail Partnerships', 1200000, 5, 'Cross-border business referral network'),
    ('VC Funnel', 'Diana Ross-Clark', 'Diana → Funded Startups → Growth Services → Exit Advisory', 7500000, 16, 'Venture capital ecosystem referral funnel')
  `);
  console.log('✅ Referral chains seeded');

  // Seed gifts & thanks (15 items)
  await pool.query(`
    INSERT INTO gifts_thanks (recipient_name, gift_type, description, cost, date_sent, occasion, response_received, notes) VALUES
    ('Pastor Mike Johnson', 'Book Set', 'Signed first edition leadership book collection', 250, '2024-01-05', 'Random Tuesday appreciation', true, 'He called and said it was the best surprise he received all year'),
    ('Sarah Chen', 'Experience', 'Private cooking class at Michelin star restaurant', 500, '2024-01-10', 'No occasion - just because', true, 'She brought her husband, deepened personal relationship'),
    ('David Martinez', 'Personalized Item', 'Custom leather portfolio with family crest engraving', 180, '2023-12-15', 'Random appreciation', true, 'Uses it at every client meeting now'),
    ('Jennifer Williams', 'Wine Collection', 'Curated selection of wines from her favorite region', 400, '2024-01-02', 'Non-birthday celebration', true, 'Texted photo of herself enjoying a bottle'),
    ('Lisa Park', 'Thank You Card', 'Handwritten 3-page letter detailing impact of her referrals', 5, '2024-01-15', 'After 50th referral milestone', true, 'She framed it in her office'),
    ('James Wilson', 'Sports Event', 'Front row tickets to basketball game with family', 800, '2023-11-20', 'No reason - surprise', true, 'Said it was the best family night out in years'),
    ('Rachel Green', 'Charity Donation', 'Donation to her favorite charity in her name', 300, '2023-12-28', 'End of year appreciation', true, 'Very moved by the gesture, sent 3 new referrals'),
    ('Chris Taylor', 'Tech Gadget', 'Latest noise-canceling headphones for his travels', 350, '2024-01-08', 'Random Wednesday gift', true, 'Perfect for his consulting travel schedule'),
    ('Amanda Lopez', 'Flowers & Note', 'Orchid arrangement with handwritten thank you', 120, '2023-12-10', 'After successful project completion', true, 'Put orchid in her office reception area'),
    ('Michael Brown', 'Subscription', 'Annual subscription to premium business publication', 200, '2024-01-01', 'New Year surprise', false, 'Sent with a note about an article he would enjoy'),
    ('Robert Thompson', 'Custom Art', 'Commissioned digital portrait of his media company logo', 350, '2023-11-15', 'Company anniversary', true, 'Hung it in his boardroom'),
    ('Patricia Hernandez', 'Gift Basket', 'Artisanal coffee and chocolate gift basket', 150, '2024-01-12', 'Random Monday surprise', true, 'Shared with her whole office team'),
    ('Warren Mitchell', 'Rare Book', 'First edition of his favorite business biography', 600, '2023-12-20', 'Pre-holiday surprise', true, 'Called it the most thoughtful gift ever'),
    ('Sandra Kim', 'Spa Package', 'Weekend spa retreat package for two', 450, '2024-01-03', 'Just because you matter', true, 'Took her mom, sent beautiful thank you card'),
    ('Douglas Rivera', 'Executive Pen', 'Montblanc pen with engraved initials', 500, '2023-12-05', 'Non-traditional giving day', true, 'Now uses it to sign every major deal')
  `);
  console.log('✅ Gifts seeded');

  // Seed client stories (15 items)
  await pool.query(`
    INSERT INTO client_stories (client_name, title, story, outcome, referrals_generated, category, is_featured) VALUES
    ('Acme Corporation', 'From Cold Call to $1.2M Partnership', 'Started as a cold outreach but we went above and beyond on their first small project. Delivered 2 weeks early and added bonus analysis at no charge.', 'They became our biggest client and referred 5 other companies in their industry.', 5, 'above_and_beyond', true),
    ('Sarah Chen', 'The Power of One Introduction', 'Pastor Mike introduced Sarah at a church event. We spent 6 months building trust before any business discussion. When the time came, she was all in.', 'Sarah became our top performer and the single most valuable referral in company history.', 12, 'patience', true),
    ('BlueStar Industries', 'Turning a Complaint into a Champion', 'BlueStar had a bad experience with their previous provider. We over-delivered on every promise and checked in weekly for the first 3 months.', 'They went from skeptic to our most vocal advocate, writing unsolicited reviews.', 8, 'above_and_beyond', true),
    ('Cascade Financial', 'The Referral That Kept Giving', 'One introduction to Cascade led to a partnership that spawned 8 referrals in a single year.', 'Each referral averaged $200K in value, creating a $1.6M pipeline from one relationship.', 8, 'centers_of_influence', true),
    ('Global Health Partners', 'Building Trust in Healthcare', 'Healthcare clients need extra trust. We offered free compliance audits for 3 months before proposing any paid services.', 'They signed a $950K contract and introduced us to their entire hospital network.', 4, 'give_first', false),
    ('Lighthouse Consulting', 'The Strategic Alliance', 'We identified complementary services and proposed a mutual referral partnership with defined expectations upfront.', 'Generated $680K in combined revenue and established a systematic referral exchange.', 6, 'expectations', true),
    ('James Wilson', 'From Competitor to Collaborator', 'James was technically a competitor, but we found non-competing ways to serve each others clients through referrals.', 'Created a unique referral partnership generating $450K in new business for both parties.', 20, 'give_referrals_first', false),
    ('Olympus Capital', 'The Million Dollar Thank You', 'After our first deal, we sent a personalized gift and handwritten letter. Olympus founder said no one had ever done that.', 'They became our #1 investor referral source, connecting us to $10M+ in investment opportunities.', 7, 'thank_you', true),
    ('DynaTech Solutions', 'Growing Together', 'Started with a $15K project. Instead of upselling, we focused on making them successful and letting them come to us.', 'Over 3 years, the relationship grew to $320K. They now refer us to every tech company they know.', 3, 'patience', false),
    ('Harbor Logistics', 'The Center of Influence Play', 'Identified Harbor as a center of influence in the logistics industry and invested heavily in the relationship without asking for anything.', 'Two years later, they introduced us to their entire vendor network - 15 new opportunities.', 15, 'centers_of_influence', false),
    ('Meridian Insurance', 'The Ideal Client Match', 'We clearly defined our ideal client profile and shared it with Meridian. They immediately knew 5 perfect matches.', 'Being specific about who we help led to higher quality referrals with 80% close rate.', 5, 'know_ideal_client', true),
    ('Rachel Green', 'Reciprocity in Action', 'We sent Rachel 3 referrals before ever asking for one. She was so impressed she made referring us a regular part of her client conversations.', 'The give-first approach generated 10x return on the referrals we gave.', 10, 'give_referrals_first', true),
    ('FrontLine Security', 'Options Beyond Referrals', 'When FrontLine wasnt comfortable giving referrals, we asked for a Google review and a LinkedIn recommendation instead.', 'The review attracted 3 inbound leads, and the LinkedIn rec built credibility for future prospects.', 3, 'give_options', false),
    ('Angela Foster', 'The Surprise Gift Strategy', 'Sent Angela an unexpected gift on a random Tuesday with a note saying she was valued. No ask, no agenda.', 'She was so moved she called and offered to introduce us to her entire rolodex of HNWI contacts.', 8, 'surprise_gifts', true),
    ('Keystone Architecture', 'Setting the Stage', 'From day one, we told Keystone our goal was to serve so well they would feel comfortable introducing us to others.', 'Setting expectations upfront made the referral conversation natural when the time came.', 4, 'expectations', false)
  `);
  console.log('✅ Client stories seeded');

  // Seed ideal client profiles (15 items)
  await pool.query(`
    INSERT INTO ideal_client_profiles (profile_name, industry, company_size, revenue_range, job_titles, pain_points, ideal_outcome, priority, notes) VALUES
    ('Enterprise Tech Leader', 'Technology', '500-5000 employees', '$50M-$500M', 'CTO, VP Engineering, IT Director', 'Scaling infrastructure, talent acquisition, digital transformation', 'Reduce costs by 30% while scaling 2x', 1, 'Highest value segment, longest sales cycle'),
    ('Growth-Stage Startup', 'Technology/SaaS', '20-200 employees', '$2M-$20M', 'CEO, Founder, COO', 'Finding product-market fit, fundraising, team building', 'Achieve Series B funding and 3x growth', 2, 'Fast decision makers, need quick results'),
    ('Financial Services Firm', 'Finance', '50-500 employees', '$10M-$100M', 'Managing Director, CFO, Head of Operations', 'Compliance, client retention, digital adaptation', 'Modernize operations while maintaining compliance', 1, 'High lifetime value, strong referral network'),
    ('Healthcare Organization', 'Healthcare', '100-2000 employees', '$20M-$200M', 'CEO, CMO, VP Operations', 'Patient experience, regulatory compliance, cost control', 'Improve patient outcomes while reducing admin costs', 2, 'Complex sales but very sticky clients'),
    ('Real Estate Developer', 'Real Estate', '10-100 employees', '$5M-$50M', 'Developer, Managing Partner, VP Development', 'Project financing, zoning issues, market timing', 'Successfully complete development projects on time and budget', 3, 'Project-based but high-value deals'),
    ('Manufacturing Company', 'Manufacturing', '100-1000 employees', '$20M-$200M', 'Plant Manager, VP Operations, Supply Chain Director', 'Supply chain disruption, automation, quality control', 'Improve efficiency by 40% through automation', 2, 'Steady business once established'),
    ('Professional Services Firm', 'Consulting/Legal/Accounting', '20-200 employees', '$5M-$50M', 'Managing Partner, Senior Partner', 'Client acquisition, talent retention, differentiation', 'Grow revenue 50% through referral-based growth', 1, 'Great centers of influence'),
    ('Insurance Agency', 'Insurance', '10-100 employees', '$2M-$20M', 'Agency Owner, VP Sales, Regional Manager', 'Client retention, cross-selling, digital transformation', 'Increase retention to 95% and grow referrals by 3x', 1, 'Natural referral partners'),
    ('Nonprofit Organization', 'Nonprofit', '20-500 employees', '$2M-$50M', 'Executive Director, Development Director, Board Chair', 'Fundraising, donor retention, program impact measurement', 'Increase donations by 40% through strategic partnerships', 3, 'Connected to wealthy donors'),
    ('E-commerce Brand', 'Retail/E-commerce', '10-200 employees', '$5M-$50M', 'CEO, CMO, Head of Growth', 'Customer acquisition cost, retention, brand building', 'Achieve 3x ROAS and 40% repeat purchase rate', 2, 'Fast-moving, data-driven decisions'),
    ('Restaurant Group', 'Hospitality', '50-500 employees', '$5M-$30M', 'Owner, Regional Manager, VP Operations', 'Staffing, food costs, customer experience', 'Open 3 new locations while maintaining quality', 3, 'Local business community connectors'),
    ('Construction Company', 'Construction', '20-500 employees', '$10M-$100M', 'Owner, Project Manager, VP Business Development', 'Bidding competition, project delays, safety compliance', 'Win 40% more bids with better margins', 2, 'Strong B2B referral potential'),
    ('Wealth Management Firm', 'Financial Services', '5-50 employees', '$1M-$20M', 'Principal, Senior Advisor, Client Relations Manager', 'HNWI client acquisition, regulatory compliance, succession', 'Grow AUM by $100M through referral partnerships', 1, 'Premium tier referral partners'),
    ('Media & Entertainment', 'Media', '20-200 employees', '$5M-$50M', 'Producer, Content Director, VP Partnerships', 'Audience growth, monetization, content distribution', 'Build audience of 1M+ and secure brand partnerships', 3, 'Great for thought leadership referrals'),
    ('Logistics Company', 'Transportation/Logistics', '50-500 employees', '$10M-$100M', 'VP Logistics, Operations Manager, CEO', 'Route optimization, driver retention, technology adoption', 'Reduce costs by 25% through tech-enabled optimization', 2, 'Need trust before referring, but loyal once established')
  `);
  console.log('✅ Ideal client profiles seeded');

  // Seed testimonials (15 items)
  await pool.query(`
    INSERT INTO testimonials (client_name, company, testimonial_text, rating, type, is_public, date_received) VALUES
    ('Sarah Chen', 'Tech Ventures Inc', 'Working with this team transformed my business. They didnt just deliver services - they became true partners invested in my success. I have referred over 12 people because I genuinely believe everyone deserves this experience.', 5, 'written', true, '2024-01-10'),
    ('Jennifer Williams', 'Capital Partners LLC', 'In 20 years of business, I have never experienced this level of dedication. They managed expectations perfectly from day one and then exceeded every single one. My referrals reflect how much I trust them.', 5, 'video', true, '2024-01-05'),
    ('David Martinez', 'Martinez Realty Group', 'They helped me find the perfect office space and then went beyond - connecting me with clients and partners I never would have found on my own. True relationship builders.', 5, 'written', true, '2023-12-20'),
    ('Lisa Park', 'Insurance Pro Solutions', 'I send them 3-4 referrals every month because I know my contacts will be treated like gold. They always say thank you in the most thoughtful ways - handwritten notes, surprise gifts.', 5, 'video', true, '2024-01-15'),
    ('James Wilson', 'Financial Wise Advisors', 'Our mutual referral partnership has generated over $450K in business for both sides. They understand that referrals are about giving first and building genuine trust over time.', 5, 'written', true, '2024-01-08'),
    ('Warren Mitchell', 'Mitchell Group', 'As someone who rarely endorses anyone, I can say without hesitation that this team exemplifies everything right about business relationships. Patient, generous, and always delivering more than promised.', 5, 'written', true, '2023-12-15'),
    ('Rachel Green', 'Green Wealth Management', 'They sent me referrals before I ever sent them one. That level of generosity is rare and it created a partnership that has been incredibly valuable for both of our businesses.', 5, 'video', true, '2024-01-12'),
    ('Chris Taylor', 'Taylor Business Consulting', 'From the first meeting, they were clear about their process and how they grow through referrals. That transparency made me comfortable and when they delivered exceptional results, referring was natural.', 4, 'written', true, '2023-12-18'),
    ('Patricia Hernandez', 'Hernandez CPA Firm', 'They understand the power of centers of influence. As a CPA with 500 clients, I dont recommend just anyone. They earned my trust through consistent excellence over 3 years.', 5, 'written', true, '2024-01-03'),
    ('Sandra Kim', 'Kim Banking Group', 'The surprise spa gift they sent me was the most thoughtful business gesture I have received. It wasnt about the money - it was that they paid attention to what I needed.', 5, 'written', true, '2024-01-07'),
    ('Angela Foster', 'Foster Real Estate', 'When they sent me an unexpected thank you gift on a random Tuesday, I knew these were people who truly valued relationships. I immediately opened my rolodex for them.', 5, 'video', true, '2023-11-20'),
    ('Douglas Rivera', 'Rivera Business Advisors', 'They know exactly who their ideal client is and communicate it clearly. That makes it easy for me to spot opportunities and make quality introductions.', 4, 'written', true, '2023-12-10'),
    ('Marcus Chen', 'Chen & Associates', 'As a business attorney, trust is everything. They built trust the right way - patiently, consistently, and by always putting the relationship ahead of the transaction.', 5, 'written', true, '2024-01-09'),
    ('Theodore Grant', 'Grant Media Empire', 'The interview we did together went viral - 10 million views. But what impressed me more was how they followed up with genuine gratitude and continued to add value to our relationship.', 5, 'video', true, '2023-12-22'),
    ('Benjamin Hayes', 'Hayes Insurance Group', 'They practice what they preach about going above and beyond. When they couldnt get a referral, they graciously asked for a testimonial instead. Smart and respectful approach.', 4, 'written', true, '2024-01-11')
  `);
  console.log('✅ Testimonials seeded');

  // Seed relationship nurturing (15 items)
  await pool.query(`
    INSERT INTO relationship_nurturing (contact_name, activity_type, description, last_interaction, next_action_date, frequency, status, notes) VALUES
    ('Pastor Mike Johnson', 'Coffee Meeting', 'Monthly breakfast to stay connected and share updates', '2024-01-10', '2024-02-10', 'monthly', 'active', 'Always ask how I can help his community first'),
    ('Sarah Chen', 'Value Add', 'Share relevant industry articles and insights weekly', '2024-01-15', '2024-01-22', 'weekly', 'active', 'She appreciates tech industry analysis'),
    ('David Martinez', 'Referral Exchange', 'Bi-weekly call to exchange referral opportunities', '2024-01-08', '2024-01-22', 'biweekly', 'active', 'Focus on commercial real estate leads'),
    ('Jennifer Williams', 'Lunch Meeting', 'Quarterly strategic lunch to discuss investment landscape', '2024-01-05', '2024-04-05', 'quarterly', 'active', 'Always at her favorite restaurant'),
    ('Lisa Park', 'Thank You Follow-up', 'Monthly thank you for referrals received', '2024-01-15', '2024-02-15', 'monthly', 'active', 'Track every referral she sends and acknowledge each one'),
    ('James Wilson', 'Joint Event', 'Co-host quarterly client appreciation events', '2023-12-15', '2024-03-15', 'quarterly', 'active', 'Great for cross-pollinating client bases'),
    ('Rachel Green', 'Send Referral', 'Proactively find and send her quality referrals', '2024-01-12', '2024-01-26', 'biweekly', 'active', 'Give referrals first - she always reciprocates'),
    ('Warren Mitchell', 'Industry Update', 'Share exclusive market insights and research', '2024-01-08', '2024-02-08', 'monthly', 'active', 'He values being first to know about trends'),
    ('Chris Taylor', 'Check-in Call', 'Monthly phone call to maintain relationship', '2024-01-11', '2024-02-11', 'monthly', 'active', 'Ask about his consulting projects and how to help'),
    ('Amanda Lopez', 'Social Media', 'Engage with her content and share her work', '2024-01-14', '2024-01-21', 'weekly', 'active', 'Genuine engagement, not just likes'),
    ('Patricia Hernandez', 'Client Introduction', 'Monthly introduction to a potential client', '2024-01-03', '2024-02-03', 'monthly', 'active', 'Focus on small business clients she specializes in'),
    ('Robert Thompson', 'Content Collaboration', 'Guest on each others podcasts quarterly', '2023-11-20', '2024-02-20', 'quarterly', 'active', 'Great for mutual audience growth'),
    ('Sandra Kim', 'Business Review', 'Semi-annual business relationship review', '2024-01-07', '2024-07-07', 'semi-annual', 'active', 'Discuss how to deepen partnership'),
    ('Michael Brown', 'Legal Networking', 'Attend bar association events together', '2023-12-10', '2024-03-10', 'quarterly', 'active', 'Great for meeting other professionals'),
    ('Nicole White', 'HR Insights', 'Share HR trends and employee benefits innovations', '2023-12-15', '2024-01-15', 'monthly', 'overdue', 'Need to reconnect and provide value')
  `);
  console.log('✅ Relationship nurturing seeded');

  // Seed expectations (15 items)
  await pool.query(`
    INSERT INTO expectations (client_name, expectation_set, date_set, response, follow_up_date, status, notes) VALUES
    ('Acme Corporation', 'Our goal is to serve you so well that you feel comfortable introducing us to others who could benefit', '2023-06-15', 'They appreciated the transparency and agreed to refer after 90 days', '2023-09-15', 'fulfilled', 'They referred 5 companies after 90 days'),
    ('BlueStar Industries', 'We grow through referrals and would love to earn the right to ask for introductions', '2023-08-01', 'Initially hesitant but agreed to see results first', '2023-11-01', 'fulfilled', 'Became vocal advocate after we exceeded expectations'),
    ('Cascade Financial', 'We treat every client like family and hope you will feel the same way about sharing us', '2023-03-20', 'Loved the family approach, immediately bought in', '2023-06-20', 'fulfilled', '8 referrals in first year'),
    ('DynaTech Solutions', 'We will deliver exceptional results and then ask if you know anyone else we can help', '2023-09-10', 'Said they would consider it based on results', '2024-01-10', 'in_progress', 'Relationship growing, 3 referrals so far'),
    ('EverGreen Properties', 'Our business grows through happy clients sharing their experience', '2023-07-15', 'Agreed to provide testimonial if service was good', '2023-10-15', 'fulfilled', 'Gave written testimonial and 2 referrals'),
    ('Global Health Partners', 'We believe in earning referrals through exceptional service and genuine care', '2023-04-01', 'Healthcare clients need more trust-building time', '2023-10-01', 'fulfilled', 'Took 6 months but delivered 4 quality referrals'),
    ('Harbor Logistics', 'If we exceed your expectations, we hope you will share your experience with peers', '2023-11-01', 'Said they typically dont give referrals but would consider', '2024-02-01', 'in_progress', 'Building trust, offered testimonial as alternative'),
    ('Infinity Labs', 'We want to earn the right to be your go-to recommendation', '2023-10-15', 'Polite but noncommittal', '2024-01-15', 'set', 'Need to focus on delivering exceptional results first'),
    ('Keystone Architecture', 'Our best clients become our best referral partners because we invest in the relationship', '2023-05-20', 'Loved the partnership mindset', '2023-08-20', 'fulfilled', '4 referrals and counting'),
    ('Lighthouse Consulting', 'We set up a mutual referral partnership with clear expectations from both sides', '2023-02-01', 'Immediately enthusiastic, proposed structured exchange', '2023-05-01', 'fulfilled', 'Most successful referral partnership to date'),
    ('Meridian Insurance', 'We help specific types of clients and would love your help identifying them', '2023-08-15', 'Appreciated the specificity, asked for ideal client profile', '2023-11-15', 'fulfilled', '5 highly targeted referrals'),
    ('Nova Education', 'We grow by making clients so happy they want to tell others', '2023-09-01', 'Seemed interested but budget constraints limited engagement', '2024-03-01', 'set', 'Need to provide more value before asking'),
    ('Olympus Capital', 'Our track record speaks for itself, and we hope to earn your advocacy', '2023-01-10', 'Impressed by confidence backed by results', '2023-04-10', 'fulfilled', 'Major referral source generating $1M+ in business'),
    ('FrontLine Security', 'If referrals arent comfortable, we also appreciate reviews and testimonials', '2023-10-01', 'Preferred giving a review over referrals', '2024-01-01', 'fulfilled', 'Gave 5-star Google review and LinkedIn recommendation'),
    ('Jupiter Marketing', 'We believe in transparent relationships and would love to discuss how we can help each other', '2023-11-15', 'Open to discussion but wants to see long-term value', '2024-02-15', 'in_progress', 'Need to continue building the relationship')
  `);
  console.log('✅ Expectations seeded');

  // Seed referral rewards (15 items)
  await pool.query(`
    INSERT INTO referral_rewards (referrer_name, reward_type, description, value, date_given, referral_source, notes) VALUES
    ('Lisa Park', 'Gift Card', 'Premium restaurant gift card for consistent monthly referrals', 200, '2024-01-15', 'Insurance partnerships', 'Most consistent referral partner - deserves regular appreciation'),
    ('Sarah Chen', 'Experience', 'VIP concert tickets for her and husband', 600, '2024-01-10', 'Tech industry connections', 'For her 12th referral that closed'),
    ('James Wilson', 'Commission', '10% referral fee on closed financial advisory deals', 4500, '2024-01-08', 'Financial services network', 'Structured mutual referral compensation agreement'),
    ('Rachel Green', 'Charity Donation', 'Donation to her children hospital charity of choice', 500, '2024-01-12', 'Wealth management referrals', 'She prefers charitable giving over personal gifts'),
    ('Pastor Mike Johnson', 'Community Support', 'Sponsored youth program at his church', 1000, '2024-01-05', 'Community connections', 'Supporting his mission is the best thank you'),
    ('David Martinez', 'Business Gift', 'Premium business card holder set with engraving', 150, '2023-12-20', 'Real estate referrals', 'Practical gift he uses daily'),
    ('Warren Mitchell', 'Exclusive Access', 'Private equity investment opportunity reserved spot', 0, '2024-01-08', 'Financial industry connections', 'Access is more valuable than money for Warren'),
    ('Chris Taylor', 'Professional Development', 'Paid registration for executive leadership conference', 2500, '2024-01-11', 'Consulting referrals', 'Investing in his growth strengthens our partnership'),
    ('Amanda Lopez', 'Marketing Support', 'Free social media campaign for her new product launch', 3000, '2023-12-15', 'Marketing network', 'Reciprocal value creation'),
    ('Patricia Hernandez', 'Thank You Basket', 'Artisanal coffee and premium chocolate basket', 175, '2024-01-03', 'CPA client referrals', 'She shares with her office team'),
    ('Angela Foster', 'Luxury Item', 'Designer handbag for her 8th referral milestone', 800, '2023-11-25', 'Real estate HNWI contacts', 'Personal touch for a high-value referrer'),
    ('Sandra Kim', 'Spa Package', 'Couples spa day for her and her partner', 450, '2024-01-07', 'Banking client referrals', 'She mentioned needing a break'),
    ('Douglas Rivera', 'Executive Gift', 'Custom Montblanc pen set for his new office', 700, '2023-12-10', 'Fortune 500 introductions', 'Elegant gift matching his professional brand'),
    ('Michael Brown', 'Wine Club', '6-month premium wine club membership', 360, '2023-12-15', 'Legal network referrals', 'Wine is his passion outside of work'),
    ('Robert Thompson', 'Media Feature', 'Featured interview on our platform with full promotion', 0, '2023-11-20', 'Media and influencer connections', 'Mutual value - exposure is his currency')
  `);
  console.log('✅ Referral rewards seeded');

  // Seed referral pipeline (15 items)
  await pool.query(`
    INSERT INTO referral_pipeline (prospect_name, company, source, stage, estimated_value, probability, expected_close, assigned_to, notes) VALUES
    ('Marcus Chen Referral #1', 'Apex Technologies', 'Marcus Chen', 'qualified', 250000, 70, '2024-03-15', 'Sales Team A', 'CTO interested in digital transformation consulting'),
    ('Lisa Park Referral #8', 'Summit Healthcare', 'Lisa Park', 'proposal', 180000, 80, '2024-02-28', 'Sales Team B', 'Healthcare org needs compliance solutions'),
    ('Warren Mitchell Intro', 'Pinnacle Fund', 'Warren Mitchell', 'negotiation', 500000, 90, '2024-02-15', 'Sales Team A', 'Investment firm wants full advisory package'),
    ('Rachel Green Connection', 'Sterling Wealth', 'Rachel Green', 'lead', 120000, 40, '2024-04-30', 'Sales Team C', 'Family office looking for risk management'),
    ('David Martinez Lead', 'Metro Development Corp', 'David Martinez', 'qualified', 350000, 60, '2024-03-30', 'Sales Team A', 'Large commercial development project'),
    ('Angela Foster HNWI', 'Private Client - Johnson', 'Angela Foster', 'proposal', 200000, 75, '2024-02-20', 'Sales Team B', 'High net worth individual estate planning needs'),
    ('Chamber Event Lead', 'Brightway Solutions', 'Raymond Brooks', 'lead', 75000, 30, '2024-05-15', 'Sales Team C', 'Met at chamber networking event'),
    ('Sandra Kim Banking Lead', 'Pacific Coast Enterprises', 'Sandra Kim', 'qualified', 160000, 55, '2024-03-20', 'Sales Team B', 'Growing business needs advisory services'),
    ('Douglas Rivera Fortune 500', 'Atlas Corporation', 'Douglas Rivera', 'negotiation', 800000, 85, '2024-02-10', 'Sales Team A', 'Enterprise consulting engagement'),
    ('Patricia CPA Referral', 'Redwood Manufacturing', 'Patricia Hernandez', 'proposal', 140000, 65, '2024-03-10', 'Sales Team C', 'Manufacturer needs operational efficiency consulting'),
    ('Theodore Media Lead', 'Horizon Media Group', 'Theodore Grant', 'lead', 95000, 35, '2024-05-01', 'Sales Team B', 'Media company interested in growth strategy'),
    ('Benjamin Insurance Lead', 'Shield Insurance Corp', 'Benjamin Hayes', 'qualified', 110000, 50, '2024-04-15', 'Sales Team C', 'Insurance firm wants digital transformation'),
    ('Catherine Nonprofit', 'United Community Foundation', 'Catherine Long', 'proposal', 85000, 70, '2024-03-01', 'Sales Team B', 'Foundation needs donor management system'),
    ('William Tech Startup', 'NexGen AI Labs', 'William Drake', 'lead', 200000, 45, '2024-04-20', 'Sales Team A', 'AI startup needs scaling advisory'),
    ('Franklin HNWI Client', 'Private Client - Williams Estate', 'Franklin Pierce', 'negotiation', 450000, 88, '2024-02-05', 'Sales Team A', 'Ultra HNWI family office comprehensive advisory')
  `);
  console.log('✅ Referral pipeline seeded');

  console.log('\n🎉 Database seeded successfully with 15 items per feature!');
  await pool.end();
}

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
