require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const db = require('../models');
const { getOrderTotals } = require('../utils/orderQuery');
const { buildReceiptAttachment } = require('../utils/orderEmail');

const includeOrder = [
  { model: db.User, attributes: ['name', 'email'] },
  {
    model: db.Product,
    through: { attributes: ['quantity', 'unit_price'] },
    attributes: ['id', 'name', 'item_code', 'description', 'unit']
  }
];

(async () => {
  try {
    const orderId = process.argv[2];
    const order = orderId
      ? await db.Order.findByPk(orderId, { include: includeOrder })
      : await db.Order.findOne({ include: includeOrder, order: [['id', 'DESC']] });

    if (!order) {
      console.error('No orders found. Place an order first or pass an order ID.');
      process.exit(1);
    }

    const totals = await getOrderTotals(db.sequelize, order);
    const { pdfBuffer, filename, title } = await buildReceiptAttachment(order, totals);
    const outDir = path.join(__dirname, '..', 'uploads');
    const outPath = path.join(outDir, filename);

    fs.writeFileSync(outPath, pdfBuffer);

    console.log(`PDF generated: ${title}`);
    console.log(`Order: ${order.order_no} (#${order.id})`);
    console.log(`Saved to: ${outPath}`);
    process.exit(0);
  } catch (err) {
    console.error('PDF test failed:', err.message);
    process.exit(1);
  }
})();
