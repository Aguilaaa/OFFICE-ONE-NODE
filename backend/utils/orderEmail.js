const sendEmail = require('./sendEmail');
const { generateReceipt, statusLabel } = require('./generatePDF');

const EMAIL_CONFIG = {
  confirmation: {
    subject: (no) => `Order Confirmation - ${no} | OfficeOne Store`,
    pdfTitle: 'ORDER CONFIRMATION',
    pdfFilename: (no) => `order-${no}.pdf`,
    intro: (no, status) => `Thank you for your order! We received your purchase and it is now <strong>${status}</strong>.`,
    footer: 'We will notify you again when your order status is updated.'
  },
  completed: {
    subject: (no) => `Order Completed - ${no} | OfficeOne Store`,
    pdfTitle: 'ORDER RECEIPT',
    pdfFilename: (no) => `receipt-${no}.pdf`,
    intro: (no) => `Great news! Your order <strong>${no}</strong> has been completed. Thank you for shopping with us!`,
    footer: 'Your receipt is attached to this email.'
  },
  cancelled: {
    subject: (no) => `Order Cancelled - ${no} | OfficeOne Store`,
    pdfTitle: 'ORDER CANCELLED',
    pdfFilename: (no) => `cancelled-${no}.pdf`,
    intro: (no) => `Your order <strong>${no}</strong> has been cancelled. If you have questions, please contact us.`,
    footer: 'If this was a mistake, please reach out to our support team.'
  },
  processing: {
    subject: (no) => `Order Update - ${no} | OfficeOne Store`,
    pdfTitle: 'ORDER UPDATE',
    pdfFilename: (no) => `order-update-${no}.pdf`,
    intro: (no, status) => `Your order <strong>${no}</strong> status has been updated to <strong>${status}</strong>.`,
    footer: 'We will keep you posted on further updates.'
  }
};

const resolveEmailType = (status, previousStatus = null) => {
  const next = status || 'Pending';
  if (!previousStatus) return 'confirmation';
  if (next === 'Completed') return 'completed';
  if (next === 'Cancelled') return 'cancelled';
  return 'processing';
};

const buildItemsHtml = (transaction) => {
  const rows = (transaction.Products || []).map((p) => {
    const line = p.TransactionItem || p.transaction_items;
    const qty = line.quantity;
    const price = parseFloat(line.unit_price);
    const lineTotal = qty * price;
    const desc = p.description ? `<br><small style="color:#64748b;">${p.description}</small>` : '';
    return `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${p.name}${desc}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${qty}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">PHP ${price.toFixed(2)}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">PHP ${lineTotal.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  return `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
      <thead>
        <tr style="background:#f1f5f9;">
          <th style="padding:8px;text-align:left;">Item</th>
          <th style="padding:8px;text-align:center;">Qty</th>
          <th style="padding:8px;text-align:right;">Unit Price</th>
          <th style="padding:8px;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

const sendOrderEmail = async (transaction, totals, type = 'confirmation', previousStatus = null) => {
  const email = transaction.User?.email;
  if (!email) return false;

  const emailType = EMAIL_CONFIG[type] ? type : resolveEmailType(transaction.status, previousStatus);
  const config = EMAIL_CONFIG[emailType];
  const orderStatus = statusLabel(transaction.status);
  const orderDate = new Date(transaction.createdAt).toLocaleString();
  const pdfBuffer = await generateReceipt(transaction, totals, { title: config.pdfTitle });

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#1e293b;">
      <h2 style="color:#1e40af;margin-bottom:4px;">OfficeOne Store</h2>
      <p style="color:#64748b;margin-top:0;">Office Supplies & Furniture</p>
      <p>Hi ${transaction.User.name},</p>
      <p>${config.intro(transaction.transaction_no, orderStatus)}</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0 0 8px;"><strong>Order #:</strong> ${transaction.transaction_no}</p>
        <p style="margin:0 0 8px;"><strong>Date:</strong> ${orderDate}</p>
        <p style="margin:0 0 8px;"><strong>Status:</strong> ${orderStatus}</p>
        ${previousStatus && previousStatus !== transaction.status
    ? `<p style="margin:0 0 8px;"><strong>Previous Status:</strong> ${statusLabel(previousStatus)}</p>`
    : ''}
        <p style="margin:0;"><strong>Grand Total:</strong> PHP ${totals.grand_total.toFixed(2)}</p>
        ${transaction.notes ? `<p style="margin:8px 0 0;"><strong>Notes:</strong> ${transaction.notes}</p>` : ''}
      </div>
      <h3 style="font-size:16px;margin-bottom:8px;">Items Purchased</h3>
      ${buildItemsHtml(transaction)}
      <p style="font-size:13px;color:#64748b;">A PDF copy of this order is attached to this email.</p>
      <p style="font-size:13px;color:#64748b;">${config.footer}</p>
    </div>
  `;

  await sendEmail({
    email,
    subject: config.subject(transaction.transaction_no),
    html,
    attachments: [{
      filename: config.pdfFilename(transaction.transaction_no),
      content: pdfBuffer
    }]
  });

  return true;
};

const queueOrderEmail = (orderId, type, previousStatus = null) => {
  setImmediate(() => {
    (async () => {
      try {
        const db = require('../models');
        const { getOrderTotals } = require('./orderQuery');
        const full = await db.Transaction.findByPk(orderId, {
          include: [
            { model: db.User, attributes: ['name', 'email'] },
            {
              model: db.Product,
              through: { attributes: ['quantity', 'unit_price'] },
              attributes: ['id', 'name', 'item_code', 'description', 'unit']
            }
          ]
        });
        if (!full) return;
        const totals = await getOrderTotals(db.sequelize, full);
        await sendOrderEmail(full, totals, type, previousStatus);
      } catch (e) {
        console.error('Order email failed:', e.message);
      }
    })();
  });
};

module.exports = { sendOrderEmail, queueOrderEmail, resolveEmailType };
