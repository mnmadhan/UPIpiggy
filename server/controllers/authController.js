const bcrypt = require("bcrypt");
const crypto = require("node:crypto");
const db = require("../db");
const { sendEmail, sendOTPEmail } = require("../utils/emailService");

/* ===============================
   SIGNUP + SEND OTP
================================ */
exports.signup = async (req, res) => {
  try {
    const { email, password, username, phone, dob } = req.body;

    if (!email || !password || !username) {
      return res.status(400).send("All fields are required");
    }

    // FIX: mysql2 returns [rows, fields] — destructure correctly
    const [existing] = await db.query(
      "SELECT id FROM users WHERE email = ? OR username = ?",
      [email, username]
    );

    if (existing.length > 0) {
      return res.status(400).send("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // FIX: use crypto.randomInt — cryptographically secure OTP
    const otp = crypto.randomInt(100000, 999999);

    req.session.otp        = otp;
    req.session.otpEmail   = email;
    req.session.otpExpires = Date.now() + 5 * 60 * 1000;
    req.session.tempUser   = { email, username, phone, dob, password: hashedPassword };

    await sendOTPEmail(email, username, otp);

    res.redirect("/otp");
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).send("Signup failed");
  }
};

/* ===============================
   VERIFY OTP + CREATE ACCOUNT
================================ */
exports.verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!req.session.otp) {
      return res.json({ success: false, message: "OTP session expired" });
    }

    if (Date.now() > req.session.otpExpires) {
      return res.json({ success: false, message: "OTP expired. Please sign up again." });
    }

    if (parseInt(otp) !== req.session.otp) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    const user = req.session.tempUser;

    // FIX: column name is `password` (matches DB dump), mysql2 placeholder is ?
    await db.query(
      `INSERT INTO users (email, username, password, phone, dob)
       VALUES (?, ?, ?, ?, ?)`,
      [user.email, user.username, user.password, user.phone || null, user.dob || null]
    );

    // Clear OTP session data
    req.session.otp      = null;
    req.session.otpEmail = null;
    req.session.otpExpires = null;
    req.session.tempUser = null;

    return res.json({ success: true, message: "OTP Verified Successfully" });
  } catch (err) {
    console.error("OTP Verify Error:", err);
    return res.json({ success: false, message: "OTP verification failed" });
  }
};

/* ===============================
   LOGIN
================================ */
exports.login = async (req, res) => {
  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res.status(400).send("Email/username and password are required");
    }

    // FIX: mysql2 placeholder is ?, not $1
    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ? OR username = ?",
      [loginId, loginId]
    );

    if (rows.length === 0) {
      return res.status(401).send("User not found");
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.status(401).send("Wrong password");

    // FIX: store `role` in session so isAdmin middleware works
    req.session.user = {
      id:       user.id,
      username: user.username,
      email:    user.email,
      role:     user.role,
    };

    res.redirect("/dashboard");
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).send("Login failed");
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

    if (!email) {
      return res.json({ success: false, message: "Email is required" });
    }

    const [rows] = await db.query(
      "SELECT id, username FROM users WHERE email = ?",
      [email]
    );

    // Return same message whether found or not (prevents email enumeration)
    if (rows.length === 0) {
      return res.json({ success: true, message: "If that email exists, an OTP has been sent." });
    }

    const user = rows[0];
    const otp  = crypto.randomInt(100000, 999999);

    req.session.resetOtp      = otp;
    req.session.resetEmail    = email;
    req.session.resetExpires  = Date.now() + 10 * 60 * 1000; // 10 min

    await sendOTPEmail(email, user.username, otp);

    res.json({ success: true, message: "OTP sent to your email." });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.json({ success: false, message: "Something went wrong" });
  }
};

/* ===============================
   RESET PASSWORD
================================ */
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.json({ success: false, message: "All fields are required" });
    }

    if (!req.session.resetOtp || req.session.resetEmail !== email) {
      return res.json({ success: false, message: "Invalid or expired session" });
    }

    if (Date.now() > req.session.resetExpires) {
      return res.json({ success: false, message: "OTP expired. Please try again." });
    }

    if (parseInt(otp) !== req.session.resetOtp) {
      return res.json({ success: false, message: "Invalid OTP" });
    }

    if (newPassword.length < 6) {
      return res.json({ success: false, message: "Password must be at least 6 characters" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await db.query(
      "UPDATE users SET password = ? WHERE email = ?",
      [hashed, email]
    );

    req.session.resetOtp     = null;
    req.session.resetEmail   = null;
    req.session.resetExpires = null;

    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.json({ success: false, message: "Reset failed" });
  }
};

/* ===============================
   ADD SAVINGS GOAL
================================ */
exports.addGoal = async (req, res) => {
  try {
    const { goalName, targetAmount } = req.body;

    if (!goalName || !targetAmount) {
      return res.status(400).send("Goal details required");
    }

    // FIX: mysql2 placeholders, correct column names matching DB dump
    await db.query(
      `INSERT INTO savings_goals (user_id, goal_name, target_amount, current_amount, is_sponsored)
       VALUES (?, ?, ?, 0, 0)`,
      [req.session.user.id, goalName, targetAmount]
    );

    res.redirect("/dashboard");
  } catch (err) {
    console.error("Add Goal Error:", err);
    res.status(500).send("Failed to add goal");
  }
};

/* ===============================
   ADD SAVINGS AMOUNT
================================ */
exports.addSavings = async (req, res) => {
  try {
    const { goalId, amount } = req.body;

    if (!goalId || !amount || Number(amount) <= 0) {
      return res.status(400).send("Invalid amount");
    }

    // FIX: correct column name current_amount, mysql2 placeholders
    await db.query(
      `UPDATE savings_goals
       SET current_amount = current_amount + ?
       WHERE id = ? AND user_id = ?`,
      [amount, goalId, req.session.user.id]
    );

    await sendEmail(
      req.session.user.email,
      "Savings Updated 💰",
      `You added ₹${amount} to your savings goal.`,
      `<h3>You added ₹${amount}</h3><p>Your goal has been updated successfully.</p>`
    );

    res.redirect("/dashboard");
  } catch (err) {
    console.error("Add Savings Error:", err);
    res.status(500).send("Failed to add savings");
  }
};
