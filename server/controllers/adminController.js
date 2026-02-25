const db = require("../db");

/* ===============================
   ✅ GET ALL USERS
================================ */
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query("SELECT id, username, email, role FROM users");
    res.json(users);
  } catch (err) {
    console.error("Admin Users Error:", err);
    res.status(500).send("Failed to fetch users");
  }
};

/* ===============================
   ✅ GET ALL PAYMENTS
================================ */
exports.getAllPayments = async (req, res) => {
  try {
    const [payments] = await db.query(
      `SELECT p.id, p.amount, p.method, p.status, p.created_at,
              u.username, g.goal_name
       FROM payments p
       JOIN users u ON p.user_id = u.id
       JOIN goals g ON p.goal_id = g.id`
    );

    res.json(payments);
  } catch (err) {
    console.error("Admin Payments Error:", err);
    res.status(500).send("Failed to fetch payments");
  }
};
