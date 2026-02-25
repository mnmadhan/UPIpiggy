const db = require("../db");
const emailService = require("../utils/emailService");

/* ===============================
   ✅ MAKE PAYMENT + ADD TO GOAL
================================ */
exports.makePayment = async (req, res) => {
  const { goalId, amount, method } = req.body;
  const userId = req.session.user.id;
  const userEmail = req.session.user.email;

  if (!goalId || !amount || amount <= 0) {
    return res.status(400).send("Invalid payment details");
  }

  if (!method) {
    return res.status(400).send("Payment method required");
  }

  try {
    /* ===============================
       ✅ CHECK GOAL BELONGS TO USER
    ================================ */
    const goalResult = await db.query(
      "SELECT * FROM savings_goals WHERE id = $1 AND user_id = $2",
      [goalId, userId]
    );

    if (goalResult.rows.length === 0) {
      return res.status(404).send("Goal not found");
    }

    const goal = goalResult.rows[0];

    /* ===============================
       ✅ BEGIN TRANSACTION
    ================================ */
    await db.query("BEGIN");

    /* ===============================
       ✅ INSERT PAYMENT RECORD
    ================================ */
    await db.query(
      `INSERT INTO payments (user_id, goal_id, amount, method, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, goalId, amount, method, "SUCCESS"]
    );

    /* ===============================
       ✅ UPDATE GOAL CURRENT AMOUNT
    ================================ */
    await db.query(
      `UPDATE savings_goals
       SET current_amount = current_amount + $1
       WHERE id = $2 AND user_id = $3`,
      [amount, goalId, userId]
    );

    /* ===============================
       ✅ COMMIT TRANSACTION
    ================================ */
    await db.query("COMMIT");

    /* ===============================
       ✅ EMAIL NOTIFICATION
    ================================ */
    await emailService.sendEmail(
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
    console.error("Payment Error:", err);

    // Rollback
    await db.query("ROLLBACK");

    res.status(500).send("Payment failed. Please try again.");
  }
};
