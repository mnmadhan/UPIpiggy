// server.js (CommonJS version)

const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();              // load .env
const routes = require('./server/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // ✅ HTTPS only in prod
      httpOnly: true,
      sameSite: 'strict'
    }
  })
);



// Static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// Uploaded profile pictures
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Views (HTML files)
app.use(express.static(path.join(__dirname, 'views')));

// Routes
app.use('/', routes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error stack:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
