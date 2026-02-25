const express = require("express");
const path = require("path");
const db = require("./db");

const router = express.Router();

const authController = require("./controllers/authController");
const paymentController = require("./controllers/paymentController");
const adminController = require("./controllers/adminController");

/* ===============================
   LOGIN CHECK
================================ */
function isLoggedIn(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
}

/* ===============================
   ADMIN CHECK
================================ */
function isAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).send("Admins only");
  }
  next();
}

/* ===============================
   AUTH ROUTES
================================ */
router.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/login.html"));
});

router.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/signup.html"));
});

router.get("/otp", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/otp.html"));
});

router.post("/signup", authController.signup);
router.post("/verify-otp", authController.verifyOtp);
router.post("/login", authController.login);
router.get("/logout", authController.logout);

/* ===============================
   ✅ LOGGED USER INFO API
================================ */
router.get("/api/user", isLoggedIn, (req, res) => {
  res.json({
    username: req.session.user.username,
    email: req.session.user.email
  });
});


/* ===============================
   DASHBOARD ROUTES
================================ */
router.get("/dashboard", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "../views/dashboard.html"));
});

/* ✅ Add Goal Route */
router.post("/add-goal", isLoggedIn, authController.addGoal);

/* ✅ Add Savings Route */
router.post("/add-savings", isLoggedIn, authController.addSavings);

/* API Goals */
router.get("/api/goals", isLoggedIn, async (req, res) => {
  const result = await db.query(
    "SELECT * FROM savings_goals WHERE user_id = $1",
    [req.session.user.id]
  );

  res.json(result.rows);
});

/* ===============================
   PAYMENT ROUTES
================================ */
router.get("/payment", isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, "../views/payment.html"));
});

router.post("/payment", isLoggedIn, paymentController.makePayment);

/* ===============================
   ADMIN ROUTES
================================ */
router.get("/admin", isLoggedIn, isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../views/admin.html"));
});

router.get("/admin/users", isLoggedIn, isAdmin, adminController.getAllUsers);
router.get("/admin/payments", isLoggedIn, isAdmin, adminController.getAllPayments);

/* ===============================
   HOME ROUTE
================================ */
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/index.html"));
});

module.exports = router;
