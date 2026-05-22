const db = require("../db");
const { sendEmail } = require("../utils/emailService");

/* ===============================
   MAKE PAYMENT + ADD TO GOAL
================================ */
exports.makePayment = async (req, res) => {
  const { goalId, amount, method } = req.body;
  const userId    = req.session.user.id;
  const userEmail = req.session.user.email;

  if (!goalId || !amount || Number(amount) <= 0) {
    return res.status(400).send("Invalid payment details");
  }

  if (!method) {
    return res.status(400).send("Payment method required");
  }

  // FIX: mysql2 returns [rows] — destructure correctly
  const conn = await db.getConnection();

  try {
    /* Verify goal belongs to this user */
    const [goalRows] = await conn.query(
      "SELECT * FROM savings_goals WHERE id = ? AND user_id = ?",
      [goalId, userId]
    );

    if (goalRows.length === 0) {
      conn.release();
      return res.status(404).send("Goal not found");
    }

    const goal = goalRows[0];

    /* BEGIN TRANSACTION */
    await conn.beginTransaction();

    /* INSERT PAYMENT — FIX: `status` column now exists in DB dump */
    await conn.query(
      `INSERT INTO payments (user_id, goal_id, amount, method, status)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, goalId, amount, method, "SUCCESS"]
    );

    /* UPDATE GOAL — FIX: column is current_amount */
    await conn.query(
      `UPDATE savings_goals
       SET current_amount = current_amount + ?
       WHERE id = ? AND user_id = ?`,
      [amount, goalId, userId]
    );

    /* COMMIT */
    await conn.commit();
    conn.release();

    /* EMAIL NOTIFICATION */
    await sendEmail(
      userEmail,
      "Payment Successful 💳",
      `You paid ₹${amount} using ${method} towards your savings goal.`,
      `
        <h2>Payment Successful 🎉</h2>
        <p><b>Goal:</b> ${goal.goal_name}</p>
        <p><b>Amount:</b> ₹${amount}</p>
        <p><b>Method:</b> ${method}</p>
        <p>Your savings goal has been updated successfully.</p>
      `
    );

    res.redirect("/dashboard");
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error("Payment Error:", err);
    res.status(500).send("Payment failed. Please try again.");
  }
};
