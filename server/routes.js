const express = require('express');
const router = express.Router();
const authController = require('./controllers/authController');
const paymentController = require('./controllers/paymentController');
const db = require('./db');

// Auth Routes
router.post('/signup', authController.signup);
router.post('/verify-otp', authController.verifyOtp);
router.post('/login', authController.login);
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Get current user's savings goals
router.get('/savings-goals', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });

  try {
    const userId = req.session.user.id;
    const goalsQuery = `
      SELECT id, goal_name, target_amount, saved_amount
      FROM savings_goals
      WHERE user_id = $1
    `;
    const goals = await db.query(goalsQuery, [userId]);

    res.json({
      user: {
        id: req.session.user.id,
        name: req.session.user.name,
        email: req.session.user.email
      },
      goals: goals.rows
    });
  } catch (err) {
    console.error('Error fetching goals:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Add new savings goal
router.post('/savings-goal', async (req, res) => {
  if (!req.session.user) return res.status(401).send('Not logged in');

  const { goal_name, target_amount } = req.body;

  try {
    await db.query(
      `INSERT INTO savings_goals (user_id, goal_name, target_amount, saved_amount)
       VALUES ($1, $2, $3, 0)`,
      [req.session.user.id, goal_name, target_amount]
    );
    res.redirect('/dashboard.html');
  } catch (err) {
    console.error('Error adding goal:', err);
    res.status(500).send('Failed to add goal');
  }
});

// Handle payment
router.post('/payment', paymentController.makePayment); 

module.exports = router;
