const { Pool } = require('pg');
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

module.exports = pool;
