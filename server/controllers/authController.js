// controllers/authController.js
const db = require('../db');
const bcrypt = require('bcrypt');
const { sendEmail } = require('../utils/emailService');

// In-memory OTP storage (⚠️ For production, use Redis or DB)
let otpStore = {};

// ---------- SIGNUP ---------- //
exports.signup = async (req, res) => {
  try {
    let { email, password, username } = req.body;
    email = (email || '').trim().toLowerCase();

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = otp;

    await sendEmail(email, 'Verify Your Account', `Your OTP is: ${otp}`);

    req.session.tempUser = { email, username, password: hashedPassword };

    res.json({ success: true, message: 'OTP sent to email.' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, message: 'Signup failed.' });
  }
};

// ---------- VERIFY OTP ---------- //
exports.verifyOtp = async (req, res) => {
  try {
    const temp = req.session.tempUser;
    if (!temp) {
      return res.status(400).json({ success: false, message: 'Session expired. Please signup again.' });
    }

    const email = (temp.email || '').trim().toLowerCase();
    const otpInput = (req.body.otp || req.body.code || '').trim();

    if (!otpInput) {
      return res.status(400).json({ success: false, message: 'OTP is required.' });
    }

    const expected = otpStore[email];
    if (!expected || expected !== otpInput) {
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }

    const result = await db.query(
      `INSERT INTO users (email, username, password)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, username, full_name, profile_picture`,
      [email, temp.username, temp.password]
    );

    let user = result.rows[0];
    if (!user) {
      const sel = await db.query(
        `SELECT id, email, username, full_name, profile_picture FROM users WHERE email=$1`,
        [email]
      );
      user = sel.rows[0];
    }

    req.session.user = user;

    delete otpStore[email];
    delete req.session.tempUser;

    await sendEmail(user.email, 'Account Created', `Welcome ${user.username}, your account has been created.`);

    res.json({ success: true, message: 'Account verified and created.', user });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ success: false, message: 'OTP verification failed.' });
  }
};

// ---------- LOGIN ---------- //
exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const result = await db.query(
      `SELECT * FROM users WHERE email = $1 OR username = $1`,
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'User not found.' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(400).json({ success: false, message: 'Invalid credentials.' });
    }

    req.session.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      full_name: user.full_name,
      profile_picture: user.profile_picture
    };

    res.json({ success: true, message: 'Login successful.', user: req.session.user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed.' });
  }
};

// ---------- LOGOUT ---------- //
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: 'Logged out successfully.' });
  });
};

// ---------- FORGOT PASSWORD ---------- //
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[email] = otp;

    await sendEmail(email, 'Password Reset OTP', `Your OTP is: ${otp}`);

    res.json({ success: true, message: 'Password reset OTP sent to email.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ success: false, message: 'Error sending OTP.' });
  }
};

// ---------- RESET PASSWORD ---------- //
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!otpStore[email] || otpStore[email] !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      `UPDATE users SET password=$1 WHERE email=$2`,
      [hashedPassword, email]
    );

    delete otpStore[email];

    res.json({ success: true, message: 'Password reset successful.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Password reset failed.' });
  }
};

// ---------- SAVINGS GOALS ---------- //
exports.createGoal = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { goal_name, target_amount } = req.body;

    const result = await db.query(
      `INSERT INTO savings_goals (user_id, goal_name, target_amount, current_amount, is_sponsored)
       VALUES ($1, $2, $3, 0, false) RETURNING *`,
      [userId, goal_name, target_amount]
    );

    res.json({ success: true, goal: result.rows[0] });
  } catch (err) {
    console.error('Create goal error:', err);
    res.status(500).json({ success: false, message: 'Error creating goal.' });
  }
};

exports.getGoals = async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Fetch goals
    const result = await db.query(
      `SELECT id, goal_name, target_amount, current_amount, is_sponsored
       FROM savings_goals WHERE user_id=$1`,
      [userId]
    );

    // Pull username/email from session
    const user = req.session.user;

    res.json({
      success: true,
      username: user.username || user.email,   // ✅ this will show in dashboard
      goals: result.rows
    });
  } catch (err) {
    console.error('Get goals error:', err);
    res.status(500).json({ success: false, message: 'Error fetching goals.' });
  }
};


exports.addToGoal = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const goalId = req.params.id;
    const { amount } = req.body;

    const result = await db.query(
      `UPDATE savings_goals 
       SET current_amount = current_amount + $1 
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [amount, goalId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Goal not found.' });
    }

    res.json({ success: true, goal: result.rows[0] });
  } catch (err) {
    console.error('Add to goal error:', err);
    res.status(500).json({ success: false, message: 'Error adding to goal.' });
  }
};

// ---------- SPONSORED GOALS ---------- //
exports.getSponsoredGoals = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, goal_name, target_amount, sponsor_name, sponsor_benefits, current_amount
       FROM sponsored_goals`
    );
    res.json({ success: true, sponsoredGoals: result.rows });
  } catch (err) {
    console.error('Get sponsored goals error:', err);
    res.status(500).json({ success: false, message: 'Error fetching sponsored goals.' });
  }
};

exports.selectSponsoredGoal = async (req, res) => {
  try {
    const { goal_name, target_amount } = req.body;
    const userId = req.session.user.id;

    const result = await db.query(
      `INSERT INTO savings_goals (user_id, goal_name, target_amount, current_amount, is_sponsored)
       VALUES ($1, $2, $3, 0, true) RETURNING *`,
      [userId, goal_name, target_amount]
    );

    res.json({ success: true, message: 'Sponsored goal added to your goals.', goal: result.rows[0] });
  } catch (err) {
    console.error('Select sponsored goal error:', err);
    res.status(500).json({ success: false, message: 'Error selecting sponsored goal.' });
  }
};

// ---------- PROFILE ---------- //
exports.completeProfile = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { full_name, gender, address, dob, phone } = req.body;

    const result = await db.query(
      `UPDATE users
       SET full_name=$1, gender=$2, address=$3, dob=$4, phone=$5
       WHERE id=$6 RETURNING id, email, username, full_name, gender, address, dob, phone, profile_picture`,
      [full_name, gender, address, dob, phone, userId]
    );

    const updatedUser = result.rows[0];
    req.session.user = updatedUser;

    res.json({ success: true, message: 'Profile completed successfully.', user: updatedUser });
  } catch (err) {
    console.error('Complete profile error:', err);
    res.status(500).json({ success: false, message: 'Error completing profile.' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { full_name, gender, address } = req.body;
    let profile_picture = req.session.user.profile_picture;

    if (req.file) {
      profile_picture = `/uploads/profile_pictures/${req.file.filename}`;
    }

    const result = await db.query(
      `UPDATE users 
       SET full_name=$1, gender=$2, address=$3, profile_picture=$4 
       WHERE id=$5 RETURNING id, email, username, full_name, profile_picture`,
      [full_name, gender, address, profile_picture, userId]
    );

    const updatedUser = result.rows[0];
    req.session.user = updatedUser;

    res.json({ success: true, message: 'Profile updated successfully.', user: updatedUser });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ success: false, message: 'Error updating profile.' });
  }
};

exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const userId = req.session.user.id;
    const profile_picture = `/uploads/profile_pictures/${req.file.filename}`;

    const result = await db.query(
      `UPDATE users SET profile_picture=$1 WHERE id=$2 RETURNING id, email, username, profile_picture`,
      [profile_picture, userId]
    );

    req.session.user = result.rows[0];

    res.json({ success: true, message: 'Profile picture updated.', user: result.rows[0] });
  } catch (err) {
    console.error('Upload profile picture error:', err);
    res.status(500).json({ success: false, message: 'Error uploading profile picture.' });
  }
};

// ---------- MIDDLEWARE ---------- //
exports.ensureAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  } else {
    return res.status(401).json({ success: false, message: 'Unauthorized. Please login.' });
  }
};

// ---------- DASHBOARD ---------- //
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const goals = await db.query(
      `SELECT * FROM savings_goals WHERE user_id = $1`,
      [userId]
    );

    const payments = await db.query(
      `SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      user: req.session.user,
      goals: goals.rows,
      payments: payments.rows
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: 'Error loading dashboard.' });
  }
};
