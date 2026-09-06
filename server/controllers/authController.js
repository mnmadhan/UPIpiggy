const bcrypt = require("bcrypt");
const crypto = require("node:crypto");
const db = require("../db");
const { sendEmail, sendOTPEmail } = require("../utils/emailService");

/* ─── Validation helpers ─────────────────────────────────── */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}
function isValidUsername(u) {
  // 3–30 chars, letters/numbers/underscores only
  return /^[a-zA-Z0-9_]{3,30}$/.test(String(u).trim());
}
function isValidPhone(p) {
  if (!p) return true; // optional
  return /^\+?[0-9]{7,15}$/.test(String(p).trim());
}
function isStrongPassword(p) {
  // at least 8 chars, one uppercase, one number, one special char
  return (
    typeof p === "string" &&
    p.length >= 8 &&
    /[A-Z]/.test(p) &&
    /[0-9]/.test(p) &&
    /[^A-Za-z0-9]/.test(p)
  );
}

/* ===============================
   SIGNUP + SEND OTP
================================ */
exports.signup = async (req, res) => {
  try {
    const { email, password, username, phone, dob } = req.body;

    // ── Server-side validation ──
    if (!email || !password || !username) {
      return res.status(400).json({ success: false, message: "Email, username and password are required." });
    }
    if (!isValidUsername(username)) {
      return res.status(400).json({ success: false, message: "Username must be 3–30 characters and contain only letters, numbers, or underscores." });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters and include an uppercase letter, a number, and a special character." });
    }
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: "Please enter a valid phone number." });
    }

    const [existing] = await db.query(
      "SELECT id FROM users WHERE email = ? OR username = ?",
      [email.trim().toLowerCase(), username.trim()]
    );
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: "An account with that email or username already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = crypto.randomInt(100000, 999999);

    // Store pending signup in session — NOT in DB yet
    req.session.otp           = otp;
    req.session.otpEmail      = email.trim().toLowerCase();
    req.session.otpExpires    = Date.now() + 5 * 60 * 1000; // 5 min
    req.session.otpAttempts   = 0;                           // FIX: track attempts
    req.session.tempUser      = {
      email:    email.trim().toLowerCase(),
      username: username.trim(),
      phone:    phone ? phone.trim() : null,
      dob:      dob || null,
      password: hashedPassword,
    };

    await sendOTPEmail(email.trim(), username.trim(), otp);

    // Respond with JSON — frontend will redirect to /otp
    return res.json({ success: true, redirect: "/otp" });
  } catch (err) {
    console.error("Signup Error:", err);
    return res.status(500).json({ success: false, message: "Signup failed. Please try again." });
  }
};

/* ===============================
   VERIFY OTP + CREATE ACCOUNT
================================ */
exports.verifyOtp = async (req, res) => {
  try {
    // ── Guard: must have an active signup session ──
    if (!req.session.otp || !req.session.tempUser) {
      return res.json({ success: false, message: "No active signup session. Please sign up again.", redirect: "/signup" });
    }

    // ── Guard: OTP expiry ──
    if (Date.now() > req.session.otpExpires) {
      req.session.otp = null;
      req.session.tempUser = null;
      return res.json({ success: false, message: "OTP expired. Please sign up again.", redirect: "/signup" });
    }

    // ── Guard: brute-force — max 5 attempts ──
    req.session.otpAttempts = (req.session.otpAttempts || 0) + 1;
    if (req.session.otpAttempts > 5) {
      req.session.otp = null;
      req.session.tempUser = null;
      return res.json({ success: false, message: "Too many failed attempts. Please sign up again.", redirect: "/signup" });
    }

    const { otp } = req.body;
    if (!otp || String(otp).trim().length !== 6 || !/^\d{6}$/.test(String(otp).trim())) {
      return res.json({ success: false, message: "Please enter a valid 6-digit OTP." });
    }

    if (parseInt(otp, 10) !== req.session.otp) {
      const remaining = 5 - req.session.otpAttempts;
      return res.json({
        success: false,
        message: remaining > 0
          ? `Incorrect OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
          : "Too many failed attempts. Please sign up again.",
        ...(remaining <= 0 ? { redirect: "/signup" } : {}),
      });
    }

    const user = req.session.tempUser;
    const upiId = user.username.toLowerCase().replace(/\s+/g, "") + "@upibank";

    // Check again for duplicates (race-condition safety)
    const [existing] = await db.query(
      "SELECT id FROM users WHERE email = ? OR username = ?",
      [user.email, user.username]
    );
    if (existing.length > 0) {
      req.session.otp = null;
      req.session.tempUser = null;
      return res.json({ success: false, message: "Account already exists. Please log in.", redirect: "/login" });
    }

    await db.query(
      `INSERT INTO users (email, username, upi_id, password, phone, dob)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.email, user.username, upiId, user.password, user.phone, user.dob]
    );

    // Clear all OTP session data
    req.session.otp         = null;
    req.session.otpEmail    = null;
    req.session.otpExpires  = null;
    req.session.otpAttempts = null;
    req.session.tempUser    = null;

    return res.json({ success: true, message: "Account created! Redirecting to login…", redirect: "/login" });
  } catch (err) {
    console.error("OTP Verify Error:", err);
    return res.json({ success: false, message: "Verification failed. Please try again." });
  }
};

/* ===============================
   RESEND OTP
================================ */
exports.resendOtp = async (req, res) => {
  try {
    if (!req.session.tempUser || !req.session.otpEmail) {
      return res.json({ success: false, message: "No pending signup session. Please sign up again.", redirect: "/signup" });
    }

    const otp = crypto.randomInt(100000, 999999);
    req.session.otp         = otp;
    req.session.otpExpires  = Date.now() + 5 * 60 * 1000;
    req.session.otpAttempts = 0; // reset attempt count on resend

    await sendOTPEmail(req.session.otpEmail, req.session.tempUser.username, otp);
    return res.json({ success: true, message: "A new OTP has been sent to your email." });
  } catch (err) {
    console.error("Resend OTP Error:", err);
    return res.json({ success: false, message: "Failed to resend OTP. Please try again." });
  }
};

/* ===============================
   LOGIN
================================ */
exports.login = async (req, res) => {
  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({ success: false, message: "Email/username and password are required." });
    }

    const id = String(loginId).trim().toLowerCase();
    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ? OR username = ?",
      [id, id]
    );

    // Generic message — don't reveal which field was wrong
    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    req.session.user = {
      id:       user.id,
      username: user.username,
      email:    user.email,
      role:     user.role,
    };

    return res.json({ success: true, redirect: "/dashboard" });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ success: false, message: "Login failed. Please try again." });
  }
};

/* ===============================
   LOGOUT
================================ */
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
};

/* ===============================
   FORGOT PASSWORD — send reset OTP
================================ */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.json({ success: false, message: "Please enter a valid email address." });
    }

    const [rows] = await db.query(
      "SELECT id, username FROM users WHERE email = ?",
      [email.trim().toLowerCase()]
    );

    // Same response whether found or not (prevents email enumeration)
    if (rows.length === 0) {
      return res.json({ success: true, message: "If that email is registered, an OTP has been sent." });
    }

    const user = rows[0];
    const otp  = crypto.randomInt(100000, 999999);

    req.session.resetOtp      = otp;
    req.session.resetEmail    = email.trim().toLowerCase();
    req.session.resetExpires  = Date.now() + 10 * 60 * 1000; // 10 min
    req.session.resetAttempts = 0;

    await sendOTPEmail(email.trim(), user.username, otp);

    return res.json({ success: true, message: "OTP sent to your email." });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    return res.json({ success: false, message: "Something went wrong. Please try again." });
  }
};

/* ===============================
   RESET PASSWORD
================================ */
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.json({ success: false, message: "All fields are required." });
    }

    if (!req.session.resetOtp || req.session.resetEmail !== email.trim().toLowerCase()) {
      return res.json({ success: false, message: "Invalid or expired session. Please request a new OTP." });
    }

    if (Date.now() > req.session.resetExpires) {
      req.session.resetOtp = null;
      return res.json({ success: false, message: "OTP expired. Please request a new one." });
    }

    // Brute-force guard
    req.session.resetAttempts = (req.session.resetAttempts || 0) + 1;
    if (req.session.resetAttempts > 5) {
      req.session.resetOtp = null;
      return res.json({ success: false, message: "Too many failed attempts. Please request a new OTP." });
    }

    if (parseInt(otp, 10) !== req.session.resetOtp) {
      const remaining = 5 - req.session.resetAttempts;
      return res.json({ success: false, message: `Incorrect OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.` });
    }

    if (!isStrongPassword(newPassword)) {
      return res.json({ success: false, message: "Password must be at least 8 characters with an uppercase letter, a number, and a special character." });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await db.query("UPDATE users SET password = ? WHERE email = ?", [hashed, email.trim().toLowerCase()]);

    req.session.resetOtp      = null;
    req.session.resetEmail    = null;
    req.session.resetExpires  = null;
    req.session.resetAttempts = null;

    return res.json({ success: true, message: "Password reset successfully. You can now log in." });
  } catch (err) {
    console.error("Reset Password Error:", err);
    return res.json({ success: false, message: "Reset failed. Please try again." });
  }
};

/* ===============================
   ADD SAVINGS GOAL
================================ */
exports.addGoal = async (req, res) => {
  try {
    const { goalName, targetAmount } = req.body;

    if (!goalName || !targetAmount) {
      return res.status(400).json({ success: false, message: "Goal name and target amount are required." });
    }

    const name   = String(goalName).trim();
    const amount = Number(targetAmount);

    if (!name || name.length > 150) {
      return res.status(400).json({ success: false, message: "Goal name must be between 1 and 150 characters." });
    }
    if (isNaN(amount) || amount <= 0 || amount > 10000000) {
      return res.status(400).json({ success: false, message: "Please enter a valid target amount (₹1 – ₹1,00,00,000)." });
    }

    await db.query(
      `INSERT INTO savings_goals (user_id, goal_name, target_amount, current_amount, is_sponsored)
       VALUES (?, ?, ?, 0, 0)`,
      [req.session.user.id, name, amount]
    );

    return res.json({ success: true, message: "Goal added successfully." });
  } catch (err) {
    console.error("Add Goal Error:", err);
    return res.status(500).json({ success: false, message: "Failed to add goal." });
  }
};

/* ===============================
   ADD SAVINGS AMOUNT
================================ */
exports.addSavings = async (req, res) => {
  try {
    const { goalId, amount } = req.body;

    if (!goalId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount." });
    }

    const amountNum = Number(amount);
    if (amountNum > 1000000) {
      return res.status(400).json({ success: false, message: "Maximum single deposit is ₹10,00,000." });
    }

    await db.query(
      `UPDATE savings_goals
       SET current_amount = current_amount + ?
       WHERE id = ? AND user_id = ?`,
      [amountNum, goalId, req.session.user.id]
    );

    await sendEmail(
      req.session.user.email,
      "Savings Updated 💰",
      `You added ₹${amountNum} to your savings goal.`,
      `<h3>You added ₹${amountNum}</h3><p>Your goal has been updated successfully.</p>`
    );

    return res.json({ success: true, message: "Savings added successfully." });
  } catch (err) {
    console.error("Add Savings Error:", err);
    return res.status(500).json({ success: false, message: "Failed to add savings." });
  }
};
