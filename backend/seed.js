require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./models');

const seed = async () => {
  try {
    await db.sequelize.sync({ alter: true });
    console.log('Tables synced.');

    const adminPass = await bcrypt.hash('admin123', 10);
    const customerPass = await bcrypt.hash('customer123', 10);

    const [admin] = await db.User.findOrCreate({
      where: { email: 'admin@officeone.com' },
      defaults: { name: 'Admin User', email: 'admin@officeone.com', password: adminPass, role: 'admin', is_active: 1, email_verified_at: new Date() }
    });
    await admin.update({ password: adminPass, role: 'admin', is_active: 1, email_verified_at: new Date() });

    const [customer] = await db.User.findOrCreate({
      where: { email: 'customer@officeone.com' },
      defaults: { name: 'Customer User', email: 'customer@officeone.com', password: customerPass, role: 'customer', is_active: 1, email_verified_at: new Date() }
    });
    await customer.update({ password: customerPass, role: 'customer', is_active: 1, email_verified_at: new Date() });

    await db.sequelize.query("UPDATE users SET role = 'customer' WHERE role = 'staff' OR role = '' OR role IS NULL").catch(() => {});
    await db.User.update(
      { role: 'customer', is_active: 0, deleted_at: new Date() },
      { where: { email: 'staff@officeone.com' } }
    ).catch(() => {});

    const products = [
      { item_code: 'SUP-001', name: 'A4 Bond Paper (500 sheets)', category: 'Product', unit: 'Ream', unit_price: 245.00, stock_quantity: 120, description: 'Premium 80gsm white bond paper' },
      { item_code: 'SUP-002', name: 'Ballpoint Pen (Blue, Box of 12)', category: 'Product', unit: 'Box', unit_price: 89.00, stock_quantity: 85, description: 'Smooth-writing ballpoint pens' },
      { item_code: 'SUP-003', name: 'Stapler Heavy Duty', category: 'Product', unit: 'Piece', unit_price: 350.00, stock_quantity: 40, description: 'Metal stapler for up to 50 sheets' },
      { item_code: 'FUR-001', name: 'Office Desk (120cm)', category: 'Product', unit: 'Piece', unit_price: 4500.00, stock_quantity: 15, description: 'Laminated wood office desk with drawer' },
      { item_code: 'FUR-002', name: 'Ergonomic Office Chair', category: 'Product', unit: 'Piece', unit_price: 3200.00, stock_quantity: 20, description: 'Adjustable mesh back office chair' },
      { item_code: 'FUR-003', name: 'Filing Cabinet 4-Drawer', category: 'Product', unit: 'Piece', unit_price: 5800.00, stock_quantity: 10, description: 'Steel filing cabinet with lock' },
      { item_code: 'SUP-004', name: 'Whiteboard Marker Set', category: 'Product', unit: 'Set', unit_price: 125.00, stock_quantity: 60, description: '4-color dry erase marker set' },
      { item_code: 'SRV-001', name: 'Office Furniture Assembly', category: 'Service', unit: 'Hour', unit_price: 500.00, stock_quantity: 0, description: 'Professional assembly service' },
      { item_code: 'SRV-002', name: 'Bulk Supply Delivery', category: 'Service', unit: 'Trip', unit_price: 350.00, stock_quantity: 0, description: 'Delivery within Metro area' },
      { item_code: 'SUP-005', name: 'Manila Envelope (Legal)', category: 'Product', unit: 'Pack', unit_price: 95.00, stock_quantity: 200, description: 'Pack of 100 legal-size envelopes' },
      { item_code: 'SUP-006', name: 'Clear Tape Dispenser', category: 'Product', unit: 'Piece', unit_price: 185.00, stock_quantity: 55, description: 'Desktop tape dispenser with non-slip base' },
      { item_code: 'SUP-007', name: 'Sticky Notes (3x3, 12 pads)', category: 'Product', unit: 'Pack', unit_price: 149.00, stock_quantity: 90, description: 'Assorted color sticky notes for reminders' },
      { item_code: 'FUR-004', name: 'Bookshelf (5-Tier)', category: 'Product', unit: 'Piece', unit_price: 2750.00, stock_quantity: 12, description: 'Open shelf unit for office documents and books' },
      { item_code: 'FUR-005', name: 'Conference Table (6-seater)', category: 'Product', unit: 'Piece', unit_price: 12500.00, stock_quantity: 5, description: 'Rectangular meeting table with cable port' },
      { item_code: 'SUP-008', name: 'Paper Shredder (Cross-cut)', category: 'Product', unit: 'Piece', unit_price: 2890.00, stock_quantity: 18, description: 'Shreds up to 8 sheets at a time' }
    ];

    for (const p of products) {
      await db.Product.findOrCreate({ where: { item_code: p.item_code }, defaults: { ...p, is_active: 1 } });
    }

    const categories = [
      { name: 'Office Supplies', type: 'Product' },
      { name: 'Office Furniture', type: 'Product' },
      { name: 'Delivery Service', type: 'Service' },
      { name: 'Assembly Service', type: 'Service' }
    ];
    for (const c of categories) {
      await db.Category.findOrCreate({ where: { name: c.name }, defaults: c });
    }

    console.log('Seed complete!');
    console.log('Admin login: admin@officeone.com / admin123');
    console.log('Customer login: customer@officeone.com / customer123');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
};

seed();
