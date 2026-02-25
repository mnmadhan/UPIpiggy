const bcrypt = require("bcrypt");
const db = require("../db");
const emailService = require("../utils/emailService");

/* ===============================
   ✅ SIGNUP + SEND OTP
================================ */
exports.signup = async (req, res) => {
  try {
    const { email, password, username, phone, dob } = req.body;

    if (!email || !password || !username) {
      return res.status(400).send("All fields are required");
    }

    // ✅ PostgreSQL Query Fix ($1, $2)
    const existing = await db.query(
      "SELECT * FROM users WHERE email = $1 OR username = $2",
      [email, username]
    );

    if (existing.rows.length > 0) {
      return res.status(400).send("User already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Store OTP in session
    req.session.otp = otp;
    req.session.otpEmail = email;
    req.session.otpExpires = Date.now() + 5 * 60 * 1000;

    // Store temp user
    req.session.tempUser = {
      email,
      username,
      phone,
      dob,
      password: hashedPassword,
    };

    // Send OTP Email
    await emailService.sendEmail(
      email,
      "UPI Bank OTP Verification",
      `Your OTP is: ${otp}`,
      `<h2>Your OTP is: <b>${otp}</b></h2><p>Valid for 5 minutes</p>`
    );

    res.redirect("/otp");
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).send("Signup failed");
  }
};

/* ===============================
   ✅ VERIFY OTP + CREATE ACCOUNT
================================ */
exports.verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!req.session.otp) {
      return res.json({
        success: false,
        message: "OTP session expired"
      });
    }

    if (Date.now() > req.session.otpExpires) {
      return res.json({
        success: false,
        message: "OTP expired. Signup again."
      });
    }

    if (parseInt(otp) !== req.session.otp) {
      return res.json({
        success: false,
        message: "Invalid OTP"
      });
    }

    const user = req.session.tempUser;

    // ✅ Insert into DB (with role if exists)
    await db.query(
      `INSERT INTO users (email, username, password, phone, dob)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.email, user.username, user.password, user.phone, user.dob]
    );

    req.session.otp = null;
    req.session.tempUser = null;

    return res.json({
      success: true,
      message: "OTP Verified Successfully"
    });

  } catch (err) {
    console.error("OTP Verify Error:", err);

    return res.json({
      success: false,
      message: "OTP verification failed"
    });
  }
};


/* ===============================
   ✅ LOGIN (SESSION + JSON)
================================ */
exports.login = async (req, res) => {
  const { loginId, password } = req.body;

  const result = await db.query(
    "SELECT * FROM users WHERE email=$1 OR username=$1",
    [loginId]
  );

  if (result.rows.length === 0) {
    return res.send("User not found");
  }

  const user = result.rows[0];

  const match = await bcrypt.compare(password, user.password);

  if (!match) return res.send("Wrong password");

  req.session.user = {
    id: user.id,
    username: user.username,
    email: user.email,
  };

  res.redirect("/dashboard");
};

/* ===============================
   ✅ LOGOUT
================================ */
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
};

/* ===============================
   ✅ ADD SAVINGS GOAL
================================ */
exports.addGoal = async (req, res) => {
  try {
    const { goalName, targetAmount } = req.body;

    if (!goalName || !targetAmount) {
      return res.status(400).send("Goal details required");
    }

    await db.query(
      `INSERT INTO savings_goals 
       (user_id, goal_name, target_amount, current_amount, is_sponsored)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.session.user.id, goalName, targetAmount, 0, false]
    );

    res.redirect("/dashboard");
  } catch (err) {
    console.error("Add Goal Error:", err);
    res.status(500).send("Failed to add goal");
  }
};


/* ===============================
   ✅ ADD SAVINGS AMOUNT
================================ */
exports.addSavings = async (req, res) => {
  try {
    const { goalId, amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).send("Invalid amount");
    }

    await db.query(
      `UPDATE savings_goals 
       SET current_amount = current_amount + $1 
       WHERE id = $2 AND user_id = $3`,
      [amount, goalId, req.session.user.id]
    );

    await emailService.sendEmail(
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
