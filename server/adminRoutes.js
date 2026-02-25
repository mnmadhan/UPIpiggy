const express = require('express');
const path = require('node:path');
const router = express.Router();
const adminController = require('./controllers/adminController');

/* ================= ADMIN LOGIN API ================= */
router.post('/login', adminController.adminLogin);

/* ================= ADMIN UI PAGE ================= */
/**
 * This is the ACTUAL admin page
 * Open in browser after login
 */
router.get('/panel', adminController.ensureAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/admin.html'));
});

/* ================= ADMIN APIs ================= */
router.use('/api', adminController.ensureAdmin);

// Sponsored goals APIs
router.post('/api/sponsored-goals', adminController.addSponsoredGoal);
router.get('/api/sponsored-goals', adminController.getSponsoredGoalsAdmin);

module.exports = router;
