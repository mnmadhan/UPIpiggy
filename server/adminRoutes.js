const express = require("express");
const path = require("node:path");
const router = express.Router();
const adminController = require("./controllers/adminController");

/* ================= ADMIN LOGIN API ================= */
router.post("/login", adminController.adminLogin);

/* ================= ADMIN LOGOUT ================= */
// FIX: admin.html calls /admin/logout — route was missing
router.get("/logout", adminController.adminLogout);

/* ================= ADMIN UI PAGE ================= */
router.get("/panel", adminController.ensureAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "../views/admin.html"));
});

/* ================= ADMIN APIs (protected) ================= */
router.use(adminController.ensureAdmin);

// Users & Payments (for admin.html data tables)
router.get("/users",    adminController.getAllUsers);
router.get("/payments", adminController.getAllPayments);

// Sponsored goals
router.post("/sponsored-goals", adminController.addSponsoredGoal);
router.get("/sponsored-goals",  adminController.getSponsoredGoalsAdmin);

module.exports = router;
