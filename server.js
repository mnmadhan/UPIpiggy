// server.js
const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');
const routes = require('./server/routes'); // ✅ Correct path

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key', // 🔒 Use env in production
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // true only if HTTPS
}));

// Static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded profile pictures
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/', routes);

// ✅ Serve HTML files from views folder
app.use(express.static(path.join(__dirname, 'views')));

// Server start
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
