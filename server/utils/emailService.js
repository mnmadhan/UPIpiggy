const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,             // Use 587 for STARTTLS
  secure: false,         // Use false for STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (to, subject, text, html) => {
  const mailOptions = {
    from: `"UPI Savings Bank" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}`);
  } catch (err) {
    console.error('❌ Error sending email:', err);
  }
};

const sendSavingsUpdateEmail = async (to, goalName, addedAmount, currentSaved, targetAmount) => {
  const remaining = targetAmount - currentSaved;

  const subject = `₹${addedAmount} added to your ${goalName} goal`;
  const text = `Hi,

₹${addedAmount} has been successfully added to your savings goal: ${goalName}.

✅ Current Saved: ₹${currentSaved}
🎯 Target: ₹${targetAmount}
📉 Remaining to reach your goal: ₹${remaining}

Keep saving! You're getting closer to your dream 🚀`;

  const html = `
    <p>Hi,</p>
    <p>₹<strong>${addedAmount}</strong> has been successfully added to your savings goal: <strong>${goalName}</strong>.</p>
    <ul>
      <li>✅ Current Saved: ₹${currentSaved}</li>
      <li>🎯 Target: ₹${targetAmount}</li>
      <li>📉 Remaining to reach your goal: ₹${remaining}</li>
    </ul>
    <p>Keep saving! You're getting closer to your dream 🚀</p>
  `;

  await sendEmail(to, subject, text, html);
};

module.exports = { sendEmail, sendSavingsUpdateEmail };
