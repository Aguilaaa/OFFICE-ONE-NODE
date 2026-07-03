const nodemailer = require('nodemailer');

const PLACEHOLDER = /your_mailtrap|change_me|example\.com/i;

const isPlaceholder = (value) => !String(value || '').trim() || PLACEHOLDER.test(String(value).trim());

let cachedTransporter = null;
let cachedMode = null;

const isSmtpConfigured = () => (
  !isPlaceholder(process.env.SMTP_HOST)
  && !isPlaceholder(process.env.SMTP_EMAIL)
  && !isPlaceholder(process.env.SMTP_PASSWORD)
);

const createSmtpTransporter = () => {
  const port = Number(process.env.SMTP_PORT) || 2525;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

const createEtherealTransporter = async () => {
  const account = await nodemailer.createTestAccount();
  console.log('[mail] No SMTP credentials found — using Ethereal test inbox.');
  console.log('[mail] Add Mailtrap username/password to backend/.env to use real SMTP.');
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: account.user,
      pass: account.pass
    }
  });
};

const getTransporter = async () => {
  if (cachedTransporter) {
    return { transporter: cachedTransporter, mode: cachedMode };
  }

  if (isSmtpConfigured()) {
    cachedTransporter = createSmtpTransporter();
    cachedMode = 'smtp';
  } else {
    cachedTransporter = await createEtherealTransporter();
    cachedMode = 'ethereal';
  }

  return { transporter: cachedTransporter, mode: cachedMode };
};

const verifyMailConfig = async () => {
  const { transporter, mode } = await getTransporter();
  await transporter.verify();
  return mode;
};

module.exports = { getTransporter, verifyMailConfig, isSmtpConfigured };
