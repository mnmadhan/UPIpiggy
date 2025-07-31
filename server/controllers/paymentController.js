const db = require('../db');
const { sendEmail } = require('../utils/emailService');

exports.makePayment = async (req, res) => {
  const { goalId, amount, method } = req.body;
  const userId = req.session.user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    console.log('Payment request:', { userId, goalId, amount, method });

    // Insert payment record
    await db.query(
      'INSERT INTO payments (user_id, goal_id, amount, method) VALUES ($1, $2, $3, $4)',
      [userId, goalId, amount, method]
    );

    // Update saved_amount in the goal
    await db.query(
      `UPDATE savings_goals
       SET saved_amount = saved_amount + $1
       WHERE id = $2 AND user_id = $3`,
      [amount, goalId, userId]
    );

    // Fetch goal details after update
    const goalResult = await db.query(
      'SELECT goal_name, saved_amount, target_amount FROM savings_goals WHERE id = $1 AND user_id = $2',
      [goalId, userId]
    );

    if (goalResult.rows.length === 0) {
      return res.status(404).json({ message: 'Goal not found after update' });
    }

    const goal = goalResult.rows[0];

    // Fetch user email
    const userResult = await db.query(
      'SELECT username, email FROM users WHERE id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    if (user?.email) {
      const subject = 'Money Added to Your Savings Goal';
      const textContent = `You successfully added ₹${amount} to your goal: ${goal.goal_name} using ${method}.
Current Saved: ₹${goal.saved_amount} / ₹${goal.target_amount}.`;
      const htmlContent = `
        <p>Hi <strong>${user.username}</strong>,</p>
        <p>You successfully added <strong>₹${amount}</strong> to your goal: <strong>${goal.goal_name}</strong> using <strong>${method}</strong>.</p>
        <p><strong>Updated Saved:</strong> ₹${goal.saved_amount} of ₹${goal.target_amount}</p>
      `;

      await sendEmail(user.email, subject, textContent, htmlContent);
    }

    res.status(200).json({
      message: 'Payment successful',
      newSavedAmount: goal.saved_amount
    });
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ message: 'Something went wrong' });
  }
};
