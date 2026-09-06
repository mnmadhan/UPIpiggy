const db = require("../db");
const { sendEmail } = require("../utils/emailService");

/* ===============================
   MAKE PAYMENT + ADD TO GOAL
   Supports both form POST (redirect) and fetch (JSON)
================================ */
exports.makePayment = async (req, res) => {
  const { goalId, amount, method } = req.body;
  const userId    = req.session.user.id;
  const userEmail = req.session.user.email;

  const isAjax = req.headers["content-type"]?.includes("application/x-www-form-urlencoded")
    && req.headers["accept"]?.includes("application/json");

  if (!goalId || !amount || Number(amount) <= 0) {
    return res.status(400).json({ success: false, message: "Invalid payment details" });
  }
  if (!method) {
    return res.status(400).json({ success: false, message: "Payment method required" });
  }

  const conn = await db.getConnection();
  try {
    const [goalRows] = await conn.query(
      "SELECT * FROM savings_goals WHERE id = ? AND user_id = ?",
      [goalId, userId]
    );
    if (goalRows.length === 0) {
      conn.release();
      return res.status(404).json({ success: false, message: "Goal not found" });
    }

    const goal = goalRows[0];
    await conn.beginTransaction();

    await conn.query(
      `INSERT INTO payments (user_id, goal_id, amount, method, status)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, goalId, amount, method, "SUCCESS"]
    );

    await conn.query(
      `UPDATE savings_goals SET current_amount = current_amount + ?
       WHERE id = ? AND user_id = ?`,
      [amount, goalId, userId]
    );

    await conn.commit();
    conn.release();

    // Email notification (non-blocking)
    sendEmail(
      userEmail,
      "✅ Payment Successful — UPI Savings Bank",
      `You deposited ₹${amount} via ${method} towards "${goal.goal_name}".`,
      `<h2 style="color:#1a7c6e">Payment Successful 🎉</h2>
       <p><b>Goal:</b> ${goal.goal_name}</p>
       <p><b>Amount:</b> ₹${Number(amount).toLocaleString('en-IN')}</p>
       <p><b>Method:</b> ${method}</p>
       <p>Your savings are growing! Keep it up.</p>`
    ).catch(err => console.warn("Email failed (non-fatal):", err.message));

    // Always respond with JSON for the upgraded frontend
    return res.json({ success: true, message: "Payment successful", amount, goalName: goal.goal_name });

  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error("Payment Error:", err);
    return res.status(500).json({ success: false, message: "Payment failed. Please try again." });
  }
};
