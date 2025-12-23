const nodemailer = require('nodemailer');
require('dotenv').config();
const crypto = require('crypto');
const transporter = nodemailer.createTransport({
  service: 'gmail', // ✅ IMPORTANT: use service instead of host/port
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

transporter.verify((err) => {
  if (err) {
    console.error('❌ Mail service unavailable:', err.message);
  } else {
    console.log('✅ Gmail SMTP ready');
  }
});

async function sendEmail(to, subject, text, html) {
  try {
    const info = await transporter.sendMail({
      from: `"UPI Money Bank" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html: html || `<p>${text}</p>`,
    });

    console.log('✅ Email sent:', info.messageId);
    return true;
  } catch (err) {
    console.error('❌ Email failed:', err.message);
    return false;
  }
}

async function sendOTPEmail(email, username, otp) {
  const ref = crypto.randomBytes(3).toString('hex').toUpperCase();

  const subject = `Your UPI Money Bank verification code • Ref ${ref}`;

  const text = `Hi ${username || ''},

Your verification code for UPI Money Bank is:

${otp}

This code is valid for a short time.

If you didn't request this, you can safely ignore this email.

Reference ID: ${ref}
UPI Money Bank`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width:600px;">
      <h2>UPI Money Bank</h2>
      <p>Hi ${username || ''},</p>
      <p>Your verification code is:</p>
      <h1 style="letter-spacing:4px;">${otp}</h1>
      <p>This code is valid for a short time.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p style="font-size:12px;color:#666;">Reference ID: ${ref}</p>
    </div>
  `;

  return sendEmail(email, subject, text, html);
}

module.exports = {
  sendEmail,
  sendOTPEmail,
};
