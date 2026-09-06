const bcrypt = require("bcrypt");
const db     = require("../db");
const { sendEmail } = require("../utils/emailService");

/* ── MIDDLEWARE ── */
exports.ensureAdmin = (req, res, next) => {
  if (!req.session.admin)
    return res.status(403).json({ success: false, message: "Admin access only" });
  next();
};

/* ── ADMIN LOGIN ── */
exports.adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.json({ success: false, message: "Username and password required" });

    const [rows] = await db.query("SELECT * FROM admins WHERE username = ?", [username]);
    if (!rows.length) return res.json({ success: false, message: "Invalid credentials" });

    const match = await bcrypt.compare(password, rows[0].password);
    if (!match) return res.json({ success: false, message: "Invalid credentials" });

    req.session.admin = { id: rows[0].id, username: rows[0].username };
    res.json({ success: true });
  } catch (err) {
    console.error("Admin Login Error:", err);
    res.json({ success: false, message: "Login failed" });
  }
};

/* ── ADMIN LOGOUT ── */
exports.adminLogout = (req, res) => {
  req.session.admin = null;
  res.json({ success: true });
};

/* ── STATS (FIX: was missing entirely) ── */
exports.getStats = async (req, res) => {
  try {
    const [[{ totalUsers }]]    = await db.query("SELECT COUNT(*) AS totalUsers FROM users");
    const [[{ totalPayments }]] = await db.query("SELECT COUNT(*) AS totalPayments FROM payments");
    const [[{ totalSaved }]]    = await db.query("SELECT COALESCE(SUM(amount),0) AS totalSaved FROM payments WHERE status='SUCCESS'");
    const [[{ pendingReqs }]]   = await db.query("SELECT COUNT(*) AS pendingReqs FROM money_requests WHERE status='PENDING'");
    res.json({ success: true, totalUsers, totalPayments, totalSaved, pendingReqs });
  } catch (err) {
    console.error("Stats Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
};

/* ── ALL USERS ── */
exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, username, email, upi_id, role, created_at FROM users ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

/* ── ALL PAYMENTS ── */
exports.getAllPayments = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.id, p.amount, p.method, p.status, p.created_at,
              u.username, g.goal_name
       FROM payments p
       JOIN users u         ON p.user_id = u.id
       JOIN savings_goals g ON p.goal_id = g.id
       ORDER BY p.created_at DESC LIMIT 100`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch payments" });
  }
};

/* ── ADD SPONSORED GOAL ── */
exports.addSponsoredGoal = async (req, res) => {
  try {
    const { goal_name, target_amount, description } = req.body;
    if (!goal_name || !target_amount)
      return res.json({ success: false, message: "Goal name and target amount required" });

    await db.query(
      "INSERT INTO sponsored_goals (goal_name, target_amount, description, created_by) VALUES (?, ?, ?, ?)",
      [goal_name, target_amount, description || null, req.session.admin.id]
    );
    res.json({ success: true, message: "Sponsored goal added" });
  } catch (err) {
    res.json({ success: false, message: "Failed to add sponsored goal" });
  }
};

/* ── GET SPONSORED GOALS ── */
exports.getSponsoredGoalsAdmin = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM sponsored_goals ORDER BY created_at DESC");
    res.json({ success: true, sponsoredGoals: rows });
  } catch (err) {
    res.json({ success: false, message: "Failed to fetch sponsored goals" });
  }
};

/* ── GET ALL MONEY REQUESTS ── */
exports.getMoneyRequests = async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT mr.id, mr.amount, mr.reason, mr.status, mr.admin_note,
             mr.created_at, mr.reviewed_at,
             u.username, u.email, g.goal_name
      FROM money_requests mr
      JOIN users         u  ON mr.user_id = u.id
      JOIN savings_goals g  ON mr.goal_id = g.id
    `;
    const params = [];
    if (status) { sql += " WHERE mr.status = ?"; params.push(status); }
    sql += " ORDER BY mr.created_at DESC";

    const [rows] = await db.query(sql, params);
    res.json({ success: true, requests: rows });
  } catch (err) {
    console.error("Get Money Requests Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch requests" });
  }
};

/* ── APPROVE REQUEST ── */
exports.approveRequest = async (req, res) => {
  const { id } = req.params;
  const { admin_note } = req.body;
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query(
      "SELECT mr.*, u.email, u.username, g.goal_name FROM money_requests mr JOIN users u ON mr.user_id=u.id JOIN savings_goals g ON mr.goal_id=g.id WHERE mr.id=? AND mr.status='PENDING'",
      [id]
    );
    if (!rows.length) { conn.release(); return res.status(404).json({ success: false, message: "Request not found or already processed" }); }

    const req_ = rows[0];
    await conn.beginTransaction();
    await conn.query(
      "UPDATE money_requests SET status='APPROVED', admin_note=?, reviewed_by=?, reviewed_at=NOW() WHERE id=?",
      [admin_note || null, req.session.admin.id, id]
    );
    await conn.query(
      "UPDATE savings_goals SET current_amount = current_amount + ? WHERE id=?",
      [req_.amount, req_.goal_id]
    );
    await conn.commit();
    conn.release();

    sendEmail(req_.email, "✅ Money Request Approved",
      `Your request for ₹${req_.amount} has been approved!`,
      `<h2>Request Approved 🎉</h2><p><b>Amount:</b> ₹${req_.amount}</p><p><b>Goal:</b> ${req_.goal_name}</p>${admin_note ? `<p><b>Note:</b> ${admin_note}</p>` : ""}`
    ).catch(() => {});

    res.json({ success: true, message: "Request approved" });
  } catch (err) {
    await conn.rollback(); conn.release();
    console.error("Approve Request Error:", err);
    res.status(500).json({ success: false, message: "Failed to approve request" });
  }
};

/* ── REJECT REQUEST ── */
exports.rejectRequest = async (req, res) => {
  const { id } = req.params;
  const { admin_note } = req.body;
  try {
    const [rows] = await db.query(
      "SELECT mr.*, u.email, u.username FROM money_requests mr JOIN users u ON mr.user_id=u.id WHERE mr.id=? AND mr.status='PENDING'",
      [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: "Request not found or already processed" });

    await db.query(
      "UPDATE money_requests SET status='REJECTED', admin_note=?, reviewed_by=?, reviewed_at=NOW() WHERE id=?",
      [admin_note || null, req.session.admin.id, id]
    );

    sendEmail(rows[0].email, "❌ Money Request Rejected",
      `Your request for ₹${rows[0].amount} was not approved.`,
      `<h2>Request Rejected</h2><p><b>Amount:</b> ₹${rows[0].amount}</p>${admin_note ? `<p><b>Reason:</b> ${admin_note}</p>` : ""}`
    ).catch(() => {});

    res.json({ success: true, message: "Request rejected" });
  } catch (err) {
    console.error("Reject Request Error:", err);
    res.status(500).json({ success: false, message: "Failed to reject request" });
  }
};
