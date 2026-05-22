// server/db.js
// FIX: switched from pg (PostgreSQL) to mysql2 to match the MySQL dump

const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT || 3306,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test connection on startup
pool.getConnection()
  .then((conn) => {
    console.log("✅ Connected to MySQL database");
    conn.release();
  })
  .catch((err) => {
    console.error("❌ Database connection error:", err.message);
  });

module.exports = pool;
