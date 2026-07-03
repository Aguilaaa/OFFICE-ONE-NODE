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
    const transaction = orderId
      ? await db.Transaction.findByPk(orderId, { include: includeOrder })
      : await db.Transaction.findOne({ include: includeOrder, order: [['id', 'DESC']] });

    if (!transaction) {
      console.error('No orders found. Place an order first or pass an order ID.');
      process.exit(1);
    }

    const totals = await getOrderTotals(db.sequelize, transaction);
    const { pdfBuffer, filename, title } = await buildReceiptAttachment(transaction, totals);
    const outDir = path.join(__dirname, '..', 'uploads');
    const outPath = path.join(outDir, filename);

    fs.writeFileSync(outPath, pdfBuffer);

    console.log(`PDF generated: ${title}`);
    console.log(`Order: ${transaction.transaction_no} (#${transaction.id})`);
    console.log(`Saved to: ${outPath}`);
    process.exit(0);
  } catch (err) {
    console.error('PDF test failed:', err.message);
    process.exit(1);
  }
})();
