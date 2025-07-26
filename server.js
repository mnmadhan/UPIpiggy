require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const routes = require('./server/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json()); // For JSON from fetch
app.use(express.static(path.join(__dirname, 'public')));

// Sessions
app.use(session({
  secret: 'upi-secret-key',
  resave: false,
  saveUninitialized: false
}));

// Serve static views
app.use(express.static(path.join(__dirname, 'views')));

// Routes
app.use('/', routes);

// Dashboard
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.send('Error during logout');
    }
    res.redirect('/login');
  });
});

// Payment Page
app.get('/payment', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.sendFile(path.join(__dirname, 'views', 'payment.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
