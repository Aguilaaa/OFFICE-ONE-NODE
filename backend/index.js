require('dotenv').config();
const app = require('./app');
const db = require('./models');
const { verifyMailConfig, isSmtpConfigured } = require('./utils/mailTransport');

const PORT = process.env.PORT || 4000;

db.sequelize.sync({ alter: false }).then(async () => {
  console.log('Database connected.');
  try {
    const mode = await verifyMailConfig();
    const label = mode === 'smtp' ? 'Mailtrap/SMTP' : 'Ethereal test inbox (add Mailtrap creds to .env)';
    console.log(`Email ready: ${label}`);
  } catch (err) {
    console.warn('Email SMTP not verified:', err.message);
  }
  app.listen(PORT, () => console.log(`OfficeOne API running on http://localhost:${PORT}`));
}).catch((err) => {
  console.error('Database connection failed:', err.message);
  process.exit(1);
});
