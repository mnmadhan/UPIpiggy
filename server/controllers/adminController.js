const bcrypt = require("bcrypt");
const db = require("../db");

/* ===============================
   MIDDLEWARE — ensure admin session
   FIX: was missing entirely; adminRoutes.js references it
================================ */
exports.ensureAdmin = (req, res, next) => {
  if (!req.session.admin) {
    return res.status(403).json({ success: false, message: "Admin access only" });
  }
  next();
};

/* ===============================
   ADMIN LOGIN
   FIX: was missing entirely; adminRoutes.js references it
================================ */
exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.json({ success: false, message: "Username and password required" });
    }

    // FIX: mysql2 returns [rows] — destructure correctly
    const [rows] = await db.query(
      "SELECT * FROM admins WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password);

    if (!match) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    req.session.admin = { id: admin.id, username: admin.username };

    res.json({ success: true, message: "Logged in" });
  } catch (err) {
    console.error("Admin Login Error:", err);
    res.json({ success: false, message: "Login failed" });
  }
};

/* ===============================
   ADMIN LOGOUT
================================ */
exports.adminLogout = (req, res) => {
  req.session.admin = null;
  res.json({ success: true });
};

/* ===============================
   GET ALL USERS
   FIX: was destructuring wrong ([users] from pg) — mysql2 returns [rows]
================================ */
exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, username, email, role, created_at FROM users"
    );
    res.json(rows);
  } catch (err) {
    console.error("Admin Users Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

/* ===============================
   GET ALL PAYMENTS
   FIX: table was referenced as `goals` — correct name is `savings_goals`
        also fixed mysql2 destructuring
================================ */
exports.getAllPayments = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.id, p.amount, p.method, p.status, p.created_at,
              u.username, g.goal_name
       FROM payments p
       JOIN users u         ON p.user_id = u.id
       JOIN savings_goals g ON p.goal_id = g.id
       ORDER BY p.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("Admin Payments Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch payments" });
  }
};

/* ===============================
   ADD SPONSORED GOAL
   FIX: was missing entirely; adminRoutes.js references it
================================ */
exports.addSponsoredGoal = async (req, res) => {
  try {
    const { goal_name, target_amount, description } = req.body;

    if (!goal_name || !target_amount) {
      return res.json({ success: false, message: "Goal name and target amount required" });
    }

    await db.query(
      `INSERT INTO sponsored_goals (goal_name, target_amount, description, created_by)
       VALUES (?, ?, ?, ?)`,
      [goal_name, target_amount, description || null, req.session.admin.id]
    );

    res.json({ success: true, message: "Sponsored goal added" });
  } catch (err) {
    console.error("Add Sponsored Goal Error:", err);
    res.json({ success: false, message: "Failed to add sponsored goal" });
  }
};

/* ===============================
   GET SPONSORED GOALS (admin view)
   FIX: was missing entirely; adminRoutes.js references it
================================ */
exports.getSponsoredGoalsAdmin = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM sponsored_goals ORDER BY created_at DESC"
    );
    res.json({ success: true, sponsoredGoals: rows });
  } catch (err) {
    console.error("Get Sponsored Goals Error:", err);
    res.json({ success: false, message: "Failed to fetch sponsored goals" });
  }
};
