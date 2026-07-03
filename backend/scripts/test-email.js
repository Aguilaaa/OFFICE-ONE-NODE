require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const sendEmail = require('../utils/sendEmail');
const { verifyMailConfig, isSmtpConfigured } = require('../utils/mailTransport');

const to = process.argv[2] || 'demo@officeone.com';

(async () => {
  try {
    const mode = await verifyMailConfig();
    console.log(`SMTP verified (${mode}${isSmtpConfigured() ? '' : ', using Ethereal fallback'}).`);

    const result = await sendEmail({
      email: to,
      subject: 'OfficeOne SMTP Test',
      html: `
        <div style="font-family:Arial,sans-serif;">
          <h2 style="color:#2563eb;">OfficeOne Store</h2>
          <p>Your SMTP setup is working.</p>
          <p>Order emails and verification emails can now be sent from the app.</p>
        </div>
      `
    });

    console.log('Test email sent.');
    if (result.previewUrl) {
      console.log('Open this link to view the message:', result.previewUrl);
    } else if (mode === 'smtp') {
      console.log('Check your Mailtrap inbox at https://mailtrap.io/inboxes');
    }
    process.exit(0);
  } catch (err) {
    console.error('SMTP test failed:', err.message);
    process.exit(1);
  }
})();
