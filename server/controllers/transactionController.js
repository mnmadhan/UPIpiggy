const db = require("../db");
const { sendEmail } = require("../utils/emailService");

/* ===============================
   TRANSACTION HISTORY
================================ */
exports.getHistory = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const [payments] = await db.query(
      `SELECT p.id, 'payment' AS type, p.amount, p.method, p.status,
              p.created_at, g.goal_name, NULL AS note
       FROM payments p
       JOIN savings_goals g ON p.goal_id = g.id
       WHERE p.user_id = ?`,
      [userId]
    );

    const [withdrawals] = await db.query(
      `SELECT w.id, 'withdrawal' AS type, w.amount, 'N/A' AS method,
              w.status, w.created_at, g.goal_name, w.note
       FROM withdrawals w
       JOIN savings_goals g ON w.goal_id = g.id
       WHERE w.user_id = ?`,
      [userId]
    );

    const history = [...payments, ...withdrawals].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    res.json({ success: true, history });
  } catch (err) {
    console.error("History Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch history" });
  }
};

/* ===============================
   WITHDRAW
================================ */
exports.withdraw = async (req, res) => {
  const { goalId, amount, note } = req.body;
  const userId = req.session.user.id;

  if (!goalId || !amount || Number(amount) <= 0)
    return res.status(400).json({ success: false, message: "Invalid withdrawal details" });

  const conn = await db.getConnection();
  try {
    const [goalRows] = await conn.query(
      "SELECT * FROM savings_goals WHERE id = ? AND user_id = ?",
      [goalId, userId]
    );
    if (!goalRows.length) { conn.release(); return res.status(404).json({ success: false, message: "Goal not found" }); }

    const goal = goalRows[0];
    if (Number(amount) > Number(goal.current_amount)) {
      conn.release();
      return res.status(400).json({ success: false, message: `Insufficient balance. Available: ₹${goal.current_amount}` });
    }

    await conn.beginTransaction();
    await conn.query(
      "UPDATE savings_goals SET current_amount = current_amount - ? WHERE id = ? AND user_id = ?",
      [amount, goalId, userId]
    );
    await conn.query(
      "INSERT INTO withdrawals (user_id, goal_id, amount, note, status) VALUES (?, ?, ?, ?, 'SUCCESS')",
      [userId, goalId, amount, note || null]
    );
    await conn.commit();
    conn.release();

    sendEmail(req.session.user.email, "Withdrawal Successful 💸",
      `You withdrew ₹${amount} from "${goal.goal_name}".`,
      `<h2>Withdrawal Successful 💸</h2><p><b>Goal:</b> ${goal.goal_name}</p><p><b>Amount:</b> ₹${amount}</p>${note ? `<p><b>Note:</b> ${note}</p>` : ""}`
    ).catch(() => {});

    res.json({ success: true, message: `₹${amount} withdrawn successfully` });
  } catch (err) {
    await conn.rollback(); conn.release();
    console.error("Withdraw Error:", err);
    res.status(500).json({ success: false, message: "Withdrawal failed" });
  }
};

/* ===============================
   GET MY UPI ID
================================ */
exports.getUpiId = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT upi_id FROM users WHERE id = ?", [req.session.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, upi_id: rows[0].upi_id });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch UPI ID" });
  }
};

/* ===============================
   REQUEST MONEY FROM ADMIN
================================ */
exports.requestMoney = async (req, res) => {
  const { goalId, amount, reason } = req.body;
  const userId = req.session.user.id;

  if (!goalId || !amount || Number(amount) <= 0)
    return res.status(400).json({ success: false, message: "Goal and amount required" });

  try {
    // Check goal belongs to user
    const [goalRows] = await db.query(
      "SELECT * FROM savings_goals WHERE id = ? AND user_id = ?",
      [goalId, userId]
    );
    if (!goalRows.length)
      return res.status(404).json({ success: false, message: "Goal not found" });

    // Prevent duplicate pending request for same goal
    const [existing] = await db.query(
      "SELECT id FROM money_requests WHERE user_id = ? AND goal_id = ? AND status = 'PENDING'",
      [userId, goalId]
    );
    if (existing.length)
      return res.status(400).json({ success: false, message: "You already have a pending request for this goal" });

    await db.query(
      "INSERT INTO money_requests (user_id, goal_id, amount, reason) VALUES (?, ?, ?, ?)",
      [userId, goalId, amount, reason || null]
    );

    res.json({ success: true, message: "Money request submitted. Admin will review it shortly." });
  } catch (err) {
    console.error("Request Money Error:", err);
    res.status(500).json({ success: false, message: "Failed to submit request" });
  }
};

/* ===============================
   GET MY MONEY REQUESTS (user view)
================================ */
exports.getMyRequests = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT mr.id, mr.amount, mr.reason, mr.status, mr.admin_note,
              mr.created_at, mr.reviewed_at, g.goal_name
       FROM money_requests mr
       JOIN savings_goals g ON mr.goal_id = g.id
       WHERE mr.user_id = ?
       ORDER BY mr.created_at DESC`,
      [req.session.user.id]
    );
    res.json({ success: true, requests: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch requests" });
  }
};
