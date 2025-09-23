const twilio = require('twilio');
require('dotenv').config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const sendOtp = async (phone, otp) => {
  try {
    await client.messages.create({
      body: `Your UPI Money Bank OTP is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    console.log(`OTP sent to ${phone}`);
  } catch (error) {
    console.error('Failed to send OTP:', error);
    throw error;
  }
};

module.exports = { sendOtp };
