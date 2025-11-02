// db.js
import { Pool } from 'pg';
import 'dotenv/config'; // Automatically loads .env

// ✅ Create PostgreSQL pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// ✅ Use top-level await to test the connection
try {
  await pool.connect();
  console.log('✅ Connected to PostgreSQL database');
} catch (err) {
  console.error('❌ Database connection error:', err);
  process.exit(1); // Exit on connection failure
}

// ✅ Export pool for queries
export default pool;
