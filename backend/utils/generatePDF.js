const PDFDocument = require('pdfkit');

const generateReceipt = (transaction, totals) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    doc.fontSize(20).text('OFFICEONE STORE', { align: 'center' });
    doc.fontSize(12).text('Office Supplies & Furniture', { align: 'center' });
    doc.moveDown();
    doc.text(`Order ID: #${transaction.id}`);
    doc.text(`Transaction No: ${transaction.transaction_no}`);
    doc.text(`Date: ${new Date(transaction.createdAt).toLocaleString()}`);
    doc.text(`Customer: ${transaction.Customer ? transaction.Customer.name : 'Walk-in'}`);
    doc.moveDown();
    doc.text('Items:', { underline: true });

    (transaction.Products || []).forEach((p) => {
      const line = p.TransactionItem || p.transaction_items;
      const qty = line.quantity;
      const price = parseFloat(line.unit_price);
      doc.text(`- ${p.name} x${qty} @ PHP ${price.toFixed(2)} = PHP ${(qty * price).toFixed(2)}`);
    });

    doc.moveDown();
    doc.text(`Subtotal: PHP ${totals.subtotal.toFixed(2)}`);
    if (parseFloat(transaction.discount) > 0) {
      doc.text(`Discount: PHP ${parseFloat(transaction.discount).toFixed(2)}`);
    }
    doc.fontSize(14).text(`Grand Total: PHP ${totals.grand_total.toFixed(2)}`, { align: 'right' });
    doc.end();
  });
};

module.exports = { generateReceipt };
