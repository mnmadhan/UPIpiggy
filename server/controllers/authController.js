const db = require('../db');
const { sendEmail } = require('../utils/emailService');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const otps = {};

// SIGNUP – Generate OTP and hash password before storing temporarily
exports.signup = async (req, res) => {
  const { email, password, age, dob, phone, username } = req.body;

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  otps[email] = {
    otp,
    data: { email, password: hashedPassword, age, dob, phone, username },
    expires: Date.now() + 300000 // 5 minutes
  };

  await sendEmail(email, 'OTP for Verification', `Your OTP is: ${otp}`);
  res.redirect('/otp');
};

// OTP VERIFICATION – Insert user into DB using hashed password
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const stored = otps[email];

    if (!stored) return res.status(400).send('No OTP found for this email');
    if (stored.otp !== otp) return res.status(400).send('Invalid OTP');
    if (stored.expires < Date.now()) return res.status(400).send('OTP expired');

    const { email: e, password, age, dob, phone, username } = stored.data;

    await db.query(
      'INSERT INTO users (email, password, age, dob, phone, username) VALUES ($1, $2, $3, $4, $5, $6)',
      [e, password, age, dob, phone, username]
    );

    delete otps[email];

    await sendEmail(email, 'Account Created', 'Your account has been successfully created!');
    res.redirect('/login');
  } catch (error) {
    console.error('OTP verification failed:', error);
    res.status(500).send('Something went wrong during verification.');
  }
};

// LOGIN – Compare hashed password using bcrypt
exports.login = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    const result = await db.query(
      'SELECT * FROM users WHERE email = $1 OR username = $1',
      [emailOrUsername]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or username.' });
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Incorrect password.' });
    }

    req.session.user = { id: user.id, username: user.username, email: user.email };
    return res.status(200).json({ message: 'Login successful' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// LOGOUT
exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
};

// DASHBOARD – Get savings goals
exports.getUserData = async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });

  const userId = req.session.user.id;
  const result = await db.query('SELECT * FROM savings_goals WHERE user_id = $1', [userId]);
  res.json({ username: req.session.user.username, goals: result.rows });
};
