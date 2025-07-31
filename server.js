const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const routes = require('./server/routes');

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: false
}));

// Serve static files from public and views
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));

// ✅ Routes to serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/login.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/signup.html'));
});

app.get('/otp', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/otp.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/dashboard.html'));
});

app.get('/payment', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/payment.html'));
});

// Use backend routes
app.use('/', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
