const bcrypt = require('bcrypt');
const db = require('./db');

exports.signup = async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  // Check if passwords match
  if (password !== confirmPassword) {
    return res.send('Passwords do not match!');
  }

  try {
    // Check if email already exists
    const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.send('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)',
      [name, email, hashedPassword]
    );

    res.send('Signup successful!');
  } catch (error) {
    console.error('Signup error:', error);
    res.send('Error during signup');
  }
};
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.send('Invalid email or password');
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.send('Invalid email or password');
    }

    // Set session
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    res.redirect('/dashboard');

  } catch (err) {
    console.error('Login error:', err);
    res.send('Error during login');
  }
};
