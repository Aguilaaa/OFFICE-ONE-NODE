require('dotenv').config();
const db = require('./models');

(async () => {
  try {
    await db.sequelize.sync({ alter: true });
    const qi = db.sequelize.getQueryInterface();
    const txCols = await qi.describeTable('transactions').catch(() => ({}));
    if (txCols.subtotal) await qi.removeColumn('transactions', 'subtotal').catch(() => {});
    if (txCols.grand_total) await qi.removeColumn('transactions', 'grand_total').catch(() => {});
    const tiCols = await qi.describeTable('transaction_items').catch(() => ({}));
    if (tiCols.line_total) await qi.removeColumn('transaction_items', 'line_total').catch(() => {});

    await db.sequelize.query("UPDATE users SET role = 'customer' WHERE role = 'staff' OR role = '' OR role IS NULL").catch(() => {});
    await db.sequelize.query(
      "ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'customer') NOT NULL DEFAULT 'customer'"
    ).catch(() => {});
    await db.sequelize.query("UPDATE users SET role = 'customer' WHERE role NOT IN ('admin', 'customer')").catch(() => {});

    console.log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
})();
