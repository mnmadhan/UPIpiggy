const db = require('../db');
const { sendEmail } = require('../utils/emailService');

// ---------- PROCESS PAYMENT ---------- //
exports.processPayment = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userId = req.session.user.id;
    const { amount, method, goal_id } = req.body;

    // Check goal exists and belongs to user
    const goalResult = await db.query(
      `SELECT * FROM savings_goals WHERE id = $1 AND user_id = $2`,
      [goal_id, userId]
    );

    if (goalResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Goal not found.' });
    }

    const goal = goalResult.rows[0];

    // Insert payment
    const paymentResult = await db.query(
      `INSERT INTO payments (user_id, amount, method, goal_id) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, amount, method, goal_id]
    );
    const payment = paymentResult.rows[0];

    // Update savings goal
    await db.query(
      `UPDATE savings_goals 
       SET current_amount = current_amount + $1 
       WHERE id = $2`,
      [amount, goal_id]
    );

    // Send email notification
    await sendEmail(
      req.session.user.email,
      'Savings Updated',
      `₹${amount} has been added to your goal "${goal.goal_name}".`
    );

    res.json({ success: true, message: 'Payment processed successfully.', payment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error processing payment.' });
  }
};

// ---------- GET USER PAYMENTS ---------- //
exports.getPayments = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userId = req.session.user.id;

    const result = await db.query(
      `SELECT p.id, p.amount, p.method, p.created_at, g.goal_name
       FROM payments p
       LEFT JOIN savings_goals g ON p.goal_id = g.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId]
    );

    res.json({ success: true, payments: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error fetching payments.' });
  }
};
