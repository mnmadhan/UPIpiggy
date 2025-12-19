// server/db.js (CommonJS)

const { Pool } = require('pg');
require('dotenv').config();

// Create PostgreSQL pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Optional: test connection (NO top-level await)
pool
  .connect()
  .then((client) => {
    console.log('✅ Connected to PostgreSQL database');
    client.release();
  })
  .catch((err) => {
    console.error('❌ Database connection error:', err);
  });

module.exports = pool;
