const express = require('express');
const router = express.Router();
const authController = require('./authController');
const db = require('./db');

// Show signup page
router.get('/signup', (req, res) => {
  res.sendFile('signup.html', { root: 'views' });
});

// Handle signup form
router.post('/signup', authController.signup);

// Show login page
router.get('/login', (req, res) => {
  res.sendFile('login.html', { root: 'views' });
});

// Handle login form
router.post('/login', authController.login);

// Dashboard page
router.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  res.sendFile('dashboard.html', { root: 'views' });
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.send('Error logging out');
    res.redirect('/login');
  });
});

// Get current user info (API)
router.get('/api/userinfo', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json(req.session.user);
});

// ✅ Create new savings goal (updated to include saved_amount = 0)
router.post('/savings-goal', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const { goal_name, target_amount } = req.body;

  try {
    await db.query(
      'INSERT INTO savings_goals (user_id, goal_name, target_amount, saved_amount) VALUES ($1, $2, $3, $4)',
      [req.session.user.id, goal_name, target_amount, 0]
    );
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Error saving goal:', err);
    res.send('Error saving goal');
  }
});

// ✅ Get all savings goals for the current user (includes saved_amount)
router.get('/savings-goals', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });

  try {
    const result = await db.query(
      'SELECT goal_name, target_amount, saved_amount FROM savings_goals WHERE user_id = $1',
      [req.session.user.id]
    );
    res.json({ user: req.session.user, goals: result.rows });
  } catch (err) {
    console.error('Error fetching goals:', err);
    res.status(500).json({ error: 'Error loading goals' });
  }
});

// ✅ Add money to an existing goal
router.post('/add-to-goal', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const { goal_name, amount } = req.body;
  const user_id = req.session.user.id;
  const numericAmount = parseFloat(amount);

  try {
    await db.query(
      `UPDATE savings_goals 
       SET saved_amount = saved_amount + $1 
       WHERE user_id = $2 AND goal_name = $3`,
      [numericAmount, user_id, goal_name]
    );
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Error adding to goal:', err);
    res.send('Error while adding to goal');
  }
});

module.exports = router;
