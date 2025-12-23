const express = require('express');
const path = require('node:path');
const router = express.Router();
const pool = require('./db'); // ✅ make sure you import your db pool

// Controllers
const authController = require('./controllers/authController');
const paymentController = require('./controllers/paymentController');

// ---------------- STATIC PAGES (Frontend Views) ----------------
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
});

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/login.html'));
});

router.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/signup.html'));
});

router.get('/otp', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/otp.html'));
});

router.get('/dashboard', authController.ensureAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/dashboard.html'));
});

router.get('/payment', authController.ensureAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/payment.html'));
});

// ---------------- PROFILE (API) ----------------
// Get logged in user profile
router.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Not logged in' });
  }
  res.json({ success: true, user: req.session.user });
});


// ✅ NEW: Complete Profile page (after signup)
router.get('/complete-profile', authController.ensureAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/complete-profile.html'));
});

// ---------------- AUTH ROUTES ----------------
router.post('/signup', authController.signup);
router.post('/verify-otp', authController.verifyOtp);
router.post('/login', authController.login); // ⚡ inside this, set req.session.userId = user.id
router.get('/logout', authController.logout);

// ---------------- COMPLETE PROFILE ----------------
router.post('/complete-profile', authController.ensureAuth, authController.completeProfile);

// ---------------- SAVINGS GOALS ----------------
router.post('/goals', authController.ensureAuth, authController.createGoal);
router.get('/goals', authController.ensureAuth, authController.getGoals);
router.post('/goals/:id/add', authController.ensureAuth, authController.addToGoal);

// ---------------- PAYMENTS ----------------
router.post('/payment', authController.ensureAuth, paymentController.processPayment);

// ---------------- PROFILE UPDATE ----------------
router.post('/profile/upload', authController.ensureAuth, authController.uploadProfilePicture);
router.post('/profile/update', authController.ensureAuth, authController.updateProfile);

// ---------------- FORGOT / RESET PASSWORD ----------------
router.get('/forgot-password', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/forgot-password.html'));
});

router.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/reset-password.html'));
});

router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// ---------------- SPONSORED GOALS ----------------
router.get('/sponsored-goals', (req, res) => {
  // 🔥 Match fields with dashboard.html expectations
  const sponsoredGoals = [
    { id: 1, goal_name: "Buy a Bike", target_amount: 20000, sponsor_benefits: "Discount on accessories" },
    { id: 2, goal_name: "iPhone 16 Pro", target_amount: 120000, sponsor_benefits: "Cashback on purchase" },
    { id: 3, goal_name: "Goa Trip", target_amount: 30000, sponsor_benefits: "Travel vouchers included" }
  ];
  res.json({ success: true, sponsoredGoals });
});

router.post('/sponsored-goals/select', authController.ensureAuth, authController.selectSponsoredGoal);

module.exports = router;
