require('dotenv').config();
const db = require('./models');

async function renameLegacyOrderTables(qi, sequelize) {
  let tables = await qi.showAllTables();

  if (tables.includes('transactions') && !tables.includes('orders')) {
    const txCols = await qi.describeTable('transactions');
    if (txCols.transaction_no && !txCols.order_no) {
      await sequelize.query(
        'ALTER TABLE transactions CHANGE transaction_no order_no VARCHAR(255) NOT NULL'
      );
    }
    await qi.renameTable('transactions', 'orders');
    console.log('Renamed table transactions -> orders');
    tables = await qi.showAllTables();
  }

  if (tables.includes('orders')) {
    const orderCols = await qi.describeTable('orders');
    if (orderCols.transaction_no && !orderCols.order_no) {
      await sequelize.query(
        'ALTER TABLE orders CHANGE transaction_no order_no VARCHAR(255) NOT NULL'
      );
    }
  }

  if (tables.includes('transaction_items') && !tables.includes('order_items')) {
    const fks = await qi.getForeignKeyReferencesForTable('transaction_items').catch(() => []);
    for (const fk of fks.filter((f) => f.columnName === 'transaction_id')) {
      await qi.removeConstraint('transaction_items', fk.constraintName).catch(() => {});
    }
    const tiCols = await qi.describeTable('transaction_items');
    if (tiCols.transaction_id && !tiCols.order_id) {
      await sequelize.query(
        'ALTER TABLE transaction_items CHANGE transaction_id order_id INT NOT NULL'
      );
    }
    await qi.renameTable('transaction_items', 'order_items');
    console.log('Renamed table transaction_items -> order_items');
    tables = await qi.showAllTables();
  }

  if (tables.includes('transactions') && tables.includes('orders')) {
    const [[{ orderCount }]] = await sequelize.query('SELECT COUNT(*) AS orderCount FROM orders');
    const [[{ txCount }]] = await sequelize.query('SELECT COUNT(*) AS txCount FROM transactions');
    if (Number(orderCount) === 0 && Number(txCount) > 0) {
      await sequelize.query(`
        INSERT INTO orders (id, order_no, notes, status, stock_deducted, created_by, deleted_at, createdAt, updatedAt)
        SELECT id, transaction_no, notes, status, stock_deducted, created_by, deleted_at, createdAt, updatedAt
        FROM transactions
      `);
      console.log(`Copied ${txCount} rows from transactions -> orders`);
    }
    tables = await qi.showAllTables();
  }

  if (tables.includes('transaction_items') && tables.includes('order_items')) {
    const [[{ itemCount }]] = await sequelize.query('SELECT COUNT(*) AS itemCount FROM order_items');
    const [[{ legacyCount }]] = await sequelize.query('SELECT COUNT(*) AS legacyCount FROM transaction_items');
    if (Number(itemCount) === 0 && Number(legacyCount) > 0) {
      await sequelize.query(`
        INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, createdAt, updatedAt)
        SELECT id, transaction_id, product_id, quantity, unit_price, createdAt, updatedAt
        FROM transaction_items
      `);
      console.log(`Copied ${legacyCount} rows from transaction_items -> order_items`);
    }
    await qi.dropTable('transaction_items');
    console.log('Dropped legacy transaction_items table');
    tables = await qi.showAllTables();
  }

  if (tables.includes('transactions') && tables.includes('orders')) {
    await qi.dropTable('transactions');
    console.log('Dropped legacy transactions table');
    tables = await qi.showAllTables();
  }

  if (tables.includes('order_items')) {
    const itemFks = await qi.getForeignKeyReferencesForTable('order_items').catch(() => []);
    if (!itemFks.some((f) => f.columnName === 'order_id')) {
      await sequelize.query(`
        ALTER TABLE order_items
        ADD CONSTRAINT order_items_order_id_fk
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      `).catch(() => {});
    }
  }
}

(async () => {
  try {
    const qi = db.sequelize.getQueryInterface();
    await renameLegacyOrderTables(qi, db.sequelize);

    await db.sequelize.query(
      "ALTER TABLE orders MODIFY COLUMN status ENUM('Draft', 'Pending', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending'"
    ).catch(() => {});
    await db.sequelize.query("UPDATE orders SET status = 'Pending' WHERE status = 'Draft'").catch(() => {});

    await db.sequelize.sync({ alter: true });

    const orderCols = await qi.describeTable('orders').catch(() => ({}));
    if (orderCols.subtotal) await qi.removeColumn('orders', 'subtotal').catch(() => {});
    if (orderCols.grand_total) await qi.removeColumn('orders', 'grand_total').catch(() => {});
    if (orderCols.discount) await qi.removeColumn('orders', 'discount').catch(() => {});
    if (!orderCols.stock_deducted) {
      await qi.addColumn('orders', 'stock_deducted', {
        type: db.Sequelize.TINYINT,
        defaultValue: 0
      }).catch(() => {});
    }
    if (orderCols.customer_id) {
      const constraints = await qi.getForeignKeyReferencesForTable('orders').catch(() => []);
      for (const constraint of constraints.filter((c) => c.columnName === 'customer_id')) {
        await qi.removeConstraint('orders', constraint.constraintName).catch(() => {});
      }
      await qi.removeColumn('orders', 'customer_id').catch(() => {});
    }
    await db.sequelize.query(
      "ALTER TABLE orders MODIFY COLUMN status ENUM('Draft', 'Pending', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending'"
    ).catch(() => {});
    await db.sequelize.query("UPDATE orders SET status = 'Pending' WHERE status = 'Draft'").catch(() => {});
    await db.sequelize.query(
      "ALTER TABLE orders MODIFY COLUMN status ENUM('Pending', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending'"
    ).catch(() => {});

    const oiCols = await qi.describeTable('order_items').catch(() => ({}));
    if (oiCols.line_total) await qi.removeColumn('order_items', 'line_total').catch(() => {});
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
