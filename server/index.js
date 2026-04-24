const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/referrals', require('./routes/referrals'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/influencers', require('./routes/influencers'));
app.use('/api/chains', require('./routes/chains'));
app.use('/api/gifts', require('./routes/gifts'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/ideal-clients', require('./routes/idealClients'));
app.use('/api/testimonials', require('./routes/testimonials'));
app.use('/api/nurturing', require('./routes/nurturing'));
app.use('/api/expectations', require('./routes/expectations'));
app.use('/api/rewards', require('./routes/rewards'));
app.use('/api/pipeline', require('./routes/pipeline'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Referral Mastery Server running on port ${PORT}`);
});
