const express = require('express');
const router = express.Router();
const authController = require('./authController');
const db = require('./db');

router.use(express.json()); // Parse JSON from fetch requests

// --- Home ---
router.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'views' });
});

// --- Auth ---
router.get('/signup', (req, res) => res.sendFile('signup.html', { root: 'views' }));
router.post('/signup', authController.signup);

router.get('/login', (req, res) => res.sendFile('login.html', { root: 'views' }));
router.post('/login', authController.login);

router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.send('Error logging out');
    res.redirect('/login');
  });
});

// --- Dashboard ---
router.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.sendFile('dashboard.html', { root: 'views' });
});

router.get('/api/userinfo', (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
  res.json(req.session.user);
});

// --- Savings Goals ---
router.post('/savings-goal', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const { goal_name, target_amount } = req.body;

  try {
    await db.query(
      'INSERT INTO savings_goals (user_id, goal_name, target_amount) VALUES ($1, $2, $3)',
      [req.session.user.id, goal_name, target_amount]
    );
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Error saving goal:', err);
    res.send('Error saving goal');
  }
});

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

router.post('/add-to-goal', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

  const { goal_name, amount } = req.body;

  try {
    await db.query(
      'UPDATE savings_goals SET saved_amount = saved_amount + $1 WHERE user_id = $2 AND goal_name = $3',
      [parseFloat(amount), req.session.user.id, goal_name]
    );
    res.status(200).json({ message: 'Money added to goal' });
  } catch (err) {
    console.error('Error adding to goal:', err);
    res.status(500).json({ error: 'Error while adding to goal' });
  }
});

});

router.post('/edit-goal', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const { old_goal_name, new_goal_name, new_target_amount } = req.body;

  try {
    await db.query(
      `UPDATE savings_goals SET goal_name = $1, target_amount = $2
       WHERE user_id = $3 AND goal_name = $4`,
      [new_goal_name, new_target_amount, req.session.user.id, old_goal_name]
    );
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Error editing goal:', err);
    res.send('Error editing goal');
  }
});

router.post('/delete-goal', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const { goal_name } = req.body;

  try {
    await db.query(
      'DELETE FROM savings_goals WHERE user_id = $1 AND goal_name = $2',
      [req.session.user.id, goal_name]
    );
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Error deleting goal:', err);
    res.send('Error deleting goal');
  }
});

// --- Payment Feature ---
router.get('/payment', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.sendFile('payment.html', { root: 'views' });
});

router.post('/payment', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

  const { to_whom, amount, description } = req.body;
  const userId = req.session.user.id;

  console.log('🔍 Payment incoming:', { userId, to_whom, amount, description });

  try {
    await db.query(
      'INSERT INTO payments (user_id, to_whom, amount, description) VALUES ($1, $2, $3, $4)',
      [userId, to_whom, parseFloat(amount), description]
    );
    res.status(200).json({ message: 'Payment successful' });
  } catch (err) {
    console.error('❌ Error saving payment:', err); // THIS is what we want to see!
    res.status(500).json({ error: 'Error saving payment' });
  }
});

router.get('/payments', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Not logged in' });

  try {
    const result = await db.query(
      'SELECT to_whom, amount, description, created_at FROM payments WHERE user_id = $1 ORDER BY created_at DESC',
      [req.session.user.id]
    );
    res.json({ payments: result.rows });
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ error: 'Error fetching payments' });
  }
});

module.exports = router;
