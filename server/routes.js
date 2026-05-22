const express = require("express");
const path = require("path");
const db = require("./db");

const router = express.Router();

const authController    = require("./controllers/authController");
const paymentController = require("./controllers/paymentController");

/* ===============================
   MIDDLEWARE
================================ */
function isLoggedIn(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

/* ===============================
   PAGE ROUTES — AUTH
================================ */
router.get("/",               (req, res) => res.sendFile(path.join(__dirname, "../views/index.html")));
router.get("/login",          (req, res) => res.sendFile(path.join(__dirname, "../views/login.html")));
router.get("/signup",         (req, res) => res.sendFile(path.join(__dirname, "../views/signup.html")));
router.get("/otp",            (req, res) => res.sendFile(path.join(__dirname, "../views/otp.html")));
router.get("/forgot-password",(req, res) => res.sendFile(path.join(__dirname, "../views/forgot-password.html")));
router.get("/reset-password", (req, res) => res.sendFile(path.join(__dirname, "../views/reset-password.html")));

/* ===============================
   POST ROUTES — AUTH
================================ */
router.post("/signup",          authController.signup);
router.post("/verify-otp",      authController.verifyOtp);
router.post("/login",           authController.login);
router.get("/logout",           authController.logout);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password",  authController.resetPassword);

/* ===============================
   API — LOGGED-IN USER
================================ */
router.get("/api/user", isLoggedIn, (req, res) => {
  res.json({
    username: req.session.user.username,
    email:    req.session.user.email,
  });
});

/* ===============================
   DASHBOARD
================================ */
router.get("/dashboard", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "../views/dashboard.html"));
});

router.post("/add-goal",    isLoggedIn, authController.addGoal);
router.post("/add-savings", isLoggedIn, authController.addSavings);

router.get("/api/goals", isLoggedIn, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM savings_goals WHERE user_id = ?",
      [req.session.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Goals API Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch goals" });
  }
});

/* ===============================
   PAYMENT
================================ */
router.get("/payment",  isLoggedIn, (req, res) =>
  res.sendFile(path.join(__dirname, "../views/payment.html"))
);
router.post("/payment", isLoggedIn, paymentController.makePayment);

module.exports = router;
