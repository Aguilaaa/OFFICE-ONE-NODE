const nodemailer = require('nodemailer');
const { getTransporter } = require('./mailTransport');

const sendEmail = async (options) => {
  const { transporter, mode } = await getTransporter();
  const fromName = process.env.SMTP_FROM_NAME || 'OfficeOne Store';
  const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@officeone.com';

  const info = await transporter.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to: options.email,
    subject: options.subject,
    html: options.html || `<p>${options.message || ''}</p>`,
    attachments: options.attachments || []
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (mode === 'ethereal' && previewUrl) {
    console.log('[mail] Preview URL:', previewUrl);
  }

  return { messageId: info.messageId, previewUrl, mode };
};

module.exports = sendEmail;
