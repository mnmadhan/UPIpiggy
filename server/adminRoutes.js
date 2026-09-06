const express = require("express");
const path    = require("node:path");
const router  = express.Router();
const adminController = require("./controllers/adminController");

// ── PUBLIC ROUTES (no auth needed) ──
// localhost:3000/admin  → serves the admin page (login overlay inside handles auth)
router.get("/",       (req, res) => res.sendFile(path.join(__dirname, "../views/admin.html")));
router.post("/login",  adminController.adminLogin);
router.get("/logout",  adminController.adminLogout);

// ── PROTECTED ROUTES (must be logged in as admin) ──
router.use(adminController.ensureAdmin);

router.get("/stats",    adminController.getStats);
router.get("/users",    adminController.getAllUsers);
router.get("/payments", adminController.getAllPayments);

router.post("/sponsored-goals", adminController.addSponsoredGoal);
router.get("/sponsored-goals",  adminController.getSponsoredGoalsAdmin);

router.get("/money-requests",               adminController.getMoneyRequests);
router.post("/money-requests/:id/approve",  adminController.approveRequest);
router.post("/money-requests/:id/reject",   adminController.rejectRequest);

module.exports = router;