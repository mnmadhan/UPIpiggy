const express = require("express");
const path    = require("path");
const db      = require("./db");
const router  = express.Router();

const authController        = require("./controllers/authController");
const paymentController     = require("./controllers/paymentController");
const transactionController = require("./controllers/transactionController");

/* ─── Auth guards ─────────────────────────────────────────── */
function isLoggedIn(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

// FIX: Guard OTP page — redirect to /signup if no pending session
function hasPendingSignup(req, res, next) {
  if (!req.session.otp || !req.session.tempUser) {
    return res.redirect("/signup");
  }
  next();
}

// ── STATIC PAGES ──
router.get("/",                (req, res) => res.sendFile(path.join(__dirname, "../views/index.html")));
router.get("/login",           (req, res) => res.sendFile(path.join(__dirname, "../views/login.html")));
router.get("/signup",          (req, res) => res.sendFile(path.join(__dirname, "../views/signup.html")));
router.get("/otp",             hasPendingSignup, (req, res) => res.sendFile(path.join(__dirname, "../views/otp.html")));
router.get("/forgot-password", (req, res) => res.sendFile(path.join(__dirname, "../views/forgot-password.html")));
router.get("/reset-password",  (req, res) => res.sendFile(path.join(__dirname, "../views/reset-password.html")));

// ── AUTH ──
router.post("/signup",          authController.signup);
router.post("/verify-otp",      authController.verifyOtp);
router.post("/resend-otp",      authController.resendOtp);
router.post("/login",           authController.login);
router.get("/logout",           authController.logout);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password",  authController.resetPassword);

// ── USER API ──
router.get("/api/user", isLoggedIn, (req, res) =>
  res.json({ username: req.session.user.username, email: req.session.user.email })
);
router.get("/api/upi-id", isLoggedIn, transactionController.getUpiId);

// ── DASHBOARD ──
router.get("/dashboard", isLoggedIn, (req, res) =>
  res.sendFile(path.join(__dirname, "../views/dashboard.html"))
);
router.post("/add-goal",    isLoggedIn, authController.addGoal);
router.post("/add-savings", isLoggedIn, authController.addSavings);

router.get("/api/goals", isLoggedIn, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM savings_goals WHERE user_id = ? ORDER BY created_at DESC",
      [req.session.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch goals" });
  }
});

// ── TRANSACTIONS ──
router.get("/api/transactions", isLoggedIn, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.id, p.amount, p.method, p.status, p.created_at, g.goal_name
       FROM payments p
       JOIN savings_goals g ON p.goal_id = g.id
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC LIMIT 20`,
      [req.session.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch transactions" });
  }
});

router.get("/api/history", isLoggedIn, transactionController.getHistory);
router.get("/history", isLoggedIn, (req, res) =>
  res.sendFile(path.join(__dirname, "../views/history.html"))
);

// ── WITHDRAW ──
router.post("/api/withdraw", isLoggedIn, transactionController.withdraw);

// ── MONEY REQUESTS ──
router.get("/requests", isLoggedIn, (req, res) =>
  res.sendFile(path.join(__dirname, "../views/requests.html"))
);
router.post("/api/money-requests", isLoggedIn, transactionController.requestMoney);
router.get("/api/money-requests",  isLoggedIn, transactionController.getMyRequests);

// ── PAYMENT ──
router.get("/payment",  isLoggedIn, (req, res) =>
  res.sendFile(path.join(__dirname, "../views/payment.html"))
);
router.post("/payment", isLoggedIn, paymentController.makePayment);

module.exports = router;
