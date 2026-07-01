const PDFDocument = require('pdfkit');

const COLORS = {
  primary: '#1e40af',
  primaryLight: '#2563eb',
  accent: '#dbeafe',
  text: '#1e293b',
  muted: '#64748b',
  border: '#cbd5e1',
  success: '#15803d',
  successBg: '#dcfce7',
  warning: '#a16207',
  warningBg: '#fef9c3',
  white: '#ffffff'
};

const statusLabel = (status) => {
  const s = status || 'Pending';
  if (s === 'Completed') return 'Completed';
  if (s === 'Cancelled') return 'Cancelled';
  return 'Processing';
};

const statusColors = (status) => {
  const s = status || 'Pending';
  if (s === 'Completed') return { bg: COLORS.successBg, text: COLORS.success };
  if (s === 'Cancelled') return { bg: '#fee2e2', text: '#b91c1c' };
  return { bg: COLORS.warningBg, text: COLORS.warning };
};

const money = (value) => `PHP ${parseFloat(value || 0).toFixed(2)}`;

const drawHeader = (doc, docTitle) => {
  const pageWidth = doc.page.width;
  const margin = doc.page.margins.left;

  doc.save();
  doc.rect(0, 0, pageWidth, 110).fill(COLORS.primary);

  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(22)
    .text('OfficeOne Store', margin, 28, { width: pageWidth - margin * 2, align: 'center' });
  doc.font('Helvetica').fontSize(11)
    .text('Office Supplies & Furniture', margin, 54, { width: pageWidth - margin * 2, align: 'center' });

  const badgeWidth = doc.widthOfString(docTitle) + 28;
  const badgeX = (pageWidth - badgeWidth) / 2;
  doc.roundedRect(badgeX, 78, badgeWidth, 22, 11).fill(COLORS.white);
  doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(10)
    .text(docTitle, badgeX, 84, { width: badgeWidth, align: 'center' });
  doc.restore();

  doc.y = 130;
};

const drawInfoBox = (doc, transaction, orderStatus) => {
  const margin = doc.page.margins.left;
  const contentWidth = doc.page.width - margin * 2;
  const startY = doc.y;
  const boxHeight = transaction.notes ? 118 : 102;

  doc.save();
  doc.roundedRect(margin, startY, contentWidth, boxHeight, 8)
    .fillAndStroke(COLORS.accent, COLORS.border);

  const leftX = margin + 16;
  const rightX = margin + contentWidth / 2 + 8;
  let y = startY + 16;

  const label = (text, x, rowY) => {
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text(text, x, rowY);
  };
  const value = (text, x, rowY, opts = {}) => {
    doc.fillColor(COLORS.text).font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10)
      .text(text, x, rowY + 11, { width: contentWidth / 2 - 24 });
  };

  label('ORDER ID', leftX, y);
  value(`#${transaction.id}`, leftX, y, { bold: true });
  label('TRANSACTION NO', rightX, y);
  value(transaction.transaction_no, rightX, y, { bold: true });
  y += 34;

  label('DATE', leftX, y);
  value(new Date(transaction.createdAt).toLocaleString(), leftX, y);
  label('CUSTOMER', rightX, y);
  value(transaction.User?.name || 'Walk-in', rightX, y);
  y += 34;

  label('EMAIL', leftX, y);
  value(transaction.User?.email || '—', leftX, y);

  const badge = statusColors(transaction.status);
  const statusText = orderStatus;
  const statusW = doc.widthOfString(statusText) + 20;
  const statusX = rightX;
  const statusY = y + 8;
  doc.roundedRect(statusX, statusY, statusW, 18, 9).fill(badge.bg);
  doc.fillColor(badge.text).font('Helvetica-Bold').fontSize(9)
    .text(statusText, statusX, statusY + 5, { width: statusW, align: 'center' });
  label('STATUS', rightX, y);

  if (transaction.notes) {
    y += 34;
    label('NOTES', leftX, y);
    value(transaction.notes, leftX, y);
  }

  doc.restore();
  doc.y = startY + boxHeight + 22;
};

const drawItemsTable = (doc, products) => {
  const margin = doc.page.margins.left;
  const contentWidth = doc.page.width - margin * 2;
  const col = {
    item: margin + 12,
    qty: margin + contentWidth * 0.58,
    unit: margin + contentWidth * 0.68,
    total: margin + contentWidth * 0.82
  };
  const startY = doc.y;

  doc.save();
  doc.roundedRect(margin, startY, contentWidth, 28, 6).fill(COLORS.primary);
  doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(9);
  doc.text('ITEM', col.item, startY + 10);
  doc.text('QTY', col.qty, startY + 10);
  doc.text('UNIT', col.unit, startY + 10);
  doc.text('TOTAL', col.total, startY + 10);
  doc.restore();

  let rowY = startY + 28;
  (products || []).forEach((p, index) => {
    const line = p.TransactionItem || p.transaction_items;
    const qty = line.quantity;
    const price = parseFloat(line.unit_price);
    const lineTotal = qty * price;
    const rowHeight = p.description ? 42 : 30;
    const bg = index % 2 === 0 ? COLORS.white : '#f8fafc';

    doc.save();
    doc.rect(margin, rowY, contentWidth, rowHeight).fill(bg);
    doc.rect(margin, rowY + rowHeight - 1, contentWidth, 1).fill(COLORS.border);
    doc.restore();

    doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(9)
      .text(p.name, col.item, rowY + 8, { width: contentWidth * 0.48 });
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
      .text(p.item_code || 'N/A', col.item, rowY + (p.description ? 20 : 18), { width: contentWidth * 0.48 });

    if (p.description) {
      doc.fontSize(7).fillColor(COLORS.muted)
        .text(p.description, col.item, rowY + 30, { width: contentWidth * 0.48, height: 10, ellipsis: true });
    }

    doc.fillColor(COLORS.text).font('Helvetica').fontSize(9);
    doc.text(String(qty), col.qty, rowY + 10);
    doc.text(money(price), col.unit, rowY + 10);
    doc.font('Helvetica-Bold').text(money(lineTotal), col.total, rowY + 10);

    rowY += rowHeight;
  });

  doc.roundedRect(margin, startY, contentWidth, rowY - startY, 8).stroke(COLORS.border);
  doc.y = rowY + 18;
};

const drawTotals = (doc, totals) => {
  const margin = doc.page.margins.left;
  const contentWidth = doc.page.width - margin * 2;
  const boxWidth = 220;
  const boxX = margin + contentWidth - boxWidth;
  const startY = doc.y;

  doc.save();
  doc.roundedRect(boxX, startY, boxWidth, 64, 8).fillAndStroke('#f1f5f9', COLORS.border);

  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9)
    .text('Subtotal', boxX + 16, startY + 14);
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(10)
    .text(money(totals.subtotal), boxX + 16, startY + 14, { width: boxWidth - 32, align: 'right' });

  doc.moveTo(boxX + 12, startY + 34).lineTo(boxX + boxWidth - 12, startY + 34).stroke(COLORS.border);

  doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(11)
    .text('Grand Total', boxX + 16, startY + 42);
  doc.fontSize(13).text(money(totals.grand_total), boxX + 16, startY + 40, { width: boxWidth - 32, align: 'right' });

  doc.restore();
  doc.y = startY + 82;
};

const drawFooter = (doc, transaction) => {
  const margin = doc.page.margins.left;
  const contentWidth = doc.page.width - margin * 2;
  const footerY = doc.page.height - 70;

  doc.save();
  doc.moveTo(margin, footerY).lineTo(margin + contentWidth, footerY).stroke(COLORS.border);

  if (transaction.status === 'Pending') {
    doc.roundedRect(margin, footerY + 10, contentWidth, 28, 6).fill(COLORS.warningBg);
    doc.fillColor(COLORS.warning).font('Helvetica-Bold').fontSize(8)
      .text('Your order is being processed. You will receive another email when it is completed.', margin + 12, footerY + 20, {
        width: contentWidth - 24,
        align: 'center'
      });
  } else {
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9)
      .text('Thank you for shopping with OfficeOne Store!', margin, footerY + 18, { width: contentWidth, align: 'center' });
    doc.fontSize(8)
      .text('For questions about this order, contact us at noreply@officeone.com', margin, footerY + 32, { width: contentWidth, align: 'center' });
  }
  doc.restore();
};

const generateReceipt = (transaction, totals, options = {}) => {
  const docTitle = options.title || (transaction.status === 'Completed' ? 'ORDER RECEIPT' : 'ORDER CONFIRMATION');
  const orderStatus = statusLabel(transaction.status);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    drawHeader(doc, docTitle);

    doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(12)
      .text('Order Summary', doc.page.margins.left, doc.y);
    doc.moveDown(0.6);

    drawInfoBox(doc, transaction, orderStatus);

    doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(12)
      .text('Items Purchased', doc.page.margins.left, doc.y);
    doc.moveDown(0.6);

    drawItemsTable(doc, transaction.Products || []);
    drawTotals(doc, totals);
    drawFooter(doc, transaction);

    doc.end();
  });
};

module.exports = { generateReceipt, statusLabel };
