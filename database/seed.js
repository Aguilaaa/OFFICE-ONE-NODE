require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../backend/models');

const seed = async () => {
  try {
    await db.sequelize.sync({ alter: true });
    console.log('Tables synced.');

    const adminPass = await bcrypt.hash('admin123', 10);
    const customerPass = await bcrypt.hash('customer123', 10);

    const [admin] = await db.User.findOrCreate({
      where: { email: 'admin@officeone.com' },
      defaults: { name: 'Admin User', email: 'admin@officeone.com', password: adminPass, role: 'admin', is_active: 1 }
    });
    await admin.update({ password: adminPass, role: 'admin', is_active: 1 });

    const [customer] = await db.User.findOrCreate({
      where: { email: 'customer@officeone.com' },
      defaults: { name: 'Customer User', email: 'customer@officeone.com', password: customerPass, role: 'customer', is_active: 1 }
    });
    await customer.update({ password: customerPass, role: 'customer', is_active: 1 });

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
      { item_code: 'SUP-005', name: 'Manila Envelope (Legal)', category: 'Product', unit: 'Pack', unit_price: 95.00, stock_quantity: 200, description: 'Pack of 100 legal-size envelopes' }
    ];

    for (const p of products) {
      await db.Product.findOrCreate({ where: { item_code: p.item_code }, defaults: { ...p, is_active: 1 } });
    }

    console.log('Seed complete!');
    console.log('Admin login: admin@officeone.com / admin123');
    console.log('Customer login: customer@officeone.com / customer123');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
};

seed();
