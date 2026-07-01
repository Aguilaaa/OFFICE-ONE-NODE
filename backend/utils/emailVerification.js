const crypto = require('crypto');
const sendEmail = require('./sendEmail');

const generateVerificationToken = () => crypto.randomBytes(32).toString('hex');

const getAppUrl = () => process.env.APP_URL || 'http://localhost:4000';

const sendVerificationEmail = async (user, token) => {
  const verifyUrl = `${getAppUrl()}/verify-email.html?token=${token}`;
  await sendEmail({
    email: user.email,
    subject: 'Verify your OfficeOne account',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
        <h2 style="color:#1e40af;">Welcome to OfficeOne Store</h2>
        <p>Hi ${user.name},</p>
        <p>Thanks for registering. Please verify your email address to activate your account and log in.</p>
        <p style="margin:24px 0;">
          <a href="${verifyUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">
            Verify Email Address
          </a>
        </p>
        <p style="color:#64748b;font-size:14px;">Or copy this link into your browser:<br>${verifyUrl}</p>
        <p style="color:#64748b;font-size:13px;">If you did not create this account, you can ignore this email.</p>
      </div>
    `
  });
};

module.exports = { generateVerificationToken, sendVerificationEmail, getAppUrl };
