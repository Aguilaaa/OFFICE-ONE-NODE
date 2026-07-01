require('dotenv').config();
const db = require('./models');

(async () => {
  try {
    await db.sequelize.query(
      "ALTER TABLE transactions MODIFY COLUMN status ENUM('Draft', 'Pending', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending'"
    ).catch(() => {});
    await db.sequelize.query("UPDATE transactions SET status = 'Pending' WHERE status = 'Draft'").catch(() => {});

    await db.sequelize.sync({ alter: true });
    const qi = db.sequelize.getQueryInterface();
    const txCols = await qi.describeTable('transactions').catch(() => ({}));
    if (txCols.subtotal) await qi.removeColumn('transactions', 'subtotal').catch(() => {});
    if (txCols.grand_total) await qi.removeColumn('transactions', 'grand_total').catch(() => {});
    if (txCols.discount) await qi.removeColumn('transactions', 'discount').catch(() => {});
    if (!txCols.stock_deducted) {
      await qi.addColumn('transactions', 'stock_deducted', {
        type: db.Sequelize.TINYINT,
        defaultValue: 0
      }).catch(() => {});
    }
    if (txCols.customer_id) {
      const constraints = await qi.getForeignKeyReferencesForTable('transactions').catch(() => []);
      for (const constraint of constraints.filter((c) => c.columnName === 'customer_id')) {
        await qi.removeConstraint('transactions', constraint.constraintName).catch(() => {});
      }
      await qi.removeColumn('transactions', 'customer_id').catch(() => {});
    }
    await db.sequelize.query(
      "ALTER TABLE transactions MODIFY COLUMN status ENUM('Draft', 'Pending', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending'"
    ).catch(() => {});
    await db.sequelize.query("UPDATE transactions SET status = 'Pending' WHERE status = 'Draft'").catch(() => {});
    await db.sequelize.query(
      "ALTER TABLE transactions MODIFY COLUMN status ENUM('Pending', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending'"
    ).catch(() => {});
    const tiCols = await qi.describeTable('transaction_items').catch(() => ({}));
    if (tiCols.line_total) await qi.removeColumn('transaction_items', 'line_total').catch(() => {});
    await qi.dropTable('units').catch(() => {});
    await qi.dropTable('customers').catch(() => {});

    const userCols = await qi.describeTable('users').catch(() => ({}));
    if (!userCols.profile_image) {
      await qi.addColumn('users', 'profile_image', {
        type: db.Sequelize.STRING,
        allowNull: true
      }).catch(() => {});
    }
    if (!userCols.email_verified_at) {
      await qi.addColumn('users', 'email_verified_at', {
        type: db.Sequelize.DATE,
        allowNull: true
      }).catch(() => {});
    }
    await db.sequelize.query('UPDATE users SET email_verified_at = NOW() WHERE email_verified_at IS NULL').catch(() => {});

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
