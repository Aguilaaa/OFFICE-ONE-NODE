const PDFDocument = require('pdfkit');

const COLORS = {
  primary: '#1e40af',
  accent: '#dbeafe',
  text: '#1e293b',
  muted: '#64748b',
  border: '#cbd5e1',
  success: '#15803d',
  successBg: '#dcfce7',
  warning: '#a16207',
  warningBg: '#fef9c3',
  white: '#ffffff',
  rowAlt: '#f8fafc'
};

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 48;

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
const contentWidth = () => PAGE.width - MARGIN * 2;

/** Draw text at x,y without triggering automatic page breaks from cursor overflow. */
const textAt = (doc, text, x, y, opts = {}) => {
  const { fillColor, font, fontSize, width, align, ellipsis } = opts;
  if (fillColor) doc.fillColor(fillColor);
  if (font) doc.font(font);
  if (fontSize) doc.fontSize(fontSize);
  const textOpts = { lineBreak: false };
  if (width) textOpts.width = width;
  if (align) textOpts.align = align;
  if (ellipsis) textOpts.ellipsis = ellipsis;
  doc.text(String(text ?? ''), x, y, textOpts);
};

const drawHeader = (doc, docTitle) => {
  const w = contentWidth();
  const headerH = 96;

  doc.save();
  doc.rect(0, 0, PAGE.width, headerH).fill(COLORS.primary);
  textAt(doc, 'OfficeOne Store', MARGIN, 24, {
    width: w,
    align: 'center',
    fillColor: COLORS.white,
    font: 'Helvetica-Bold',
    fontSize: 22
  });
  textAt(doc, 'Office Supplies & Furniture', MARGIN, 50, {
    width: w,
    align: 'center',
    fillColor: COLORS.white,
    font: 'Helvetica',
    fontSize: 10
  });

  const badgeW = Math.min(doc.widthOfString(docTitle) + 32, w);
  const badgeX = MARGIN + (w - badgeW) / 2;
  doc.roundedRect(badgeX, 68, badgeW, 20, 10).fill(COLORS.white);
  textAt(doc, docTitle, badgeX, 73, {
    width: badgeW,
    align: 'center',
    fillColor: COLORS.primary,
    font: 'Helvetica-Bold',
    fontSize: 9
  });
  doc.restore();

  return headerH + 24;
};

const drawSectionTitle = (doc, y, title) => {
  doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(11).text(title, MARGIN, y);
  return y + 20;
};

const drawInfoBox = (doc, y, order, orderStatus) => {
  const w = contentWidth();
  const hasNotes = Boolean(order.notes);
  const boxH = hasNotes ? 112 : 96;

  doc.save();
  doc.roundedRect(MARGIN, y, w, boxH, 8).fillAndStroke(COLORS.accent, COLORS.border);

  const leftX = MARGIN + 14;
  const rightX = MARGIN + w / 2 + 6;
  const colW = w / 2 - 22;

  const drawField = (label, value, x, rowY, bold = false) => {
    textAt(doc, label, x, rowY, { fillColor: COLORS.muted, font: 'Helvetica', fontSize: 7 });
    doc.fillColor(COLORS.text).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9)
      .text(String(value ?? '—'), x, rowY + 10, { width: colW, lineBreak: false, ellipsis: true });
  };

  let rowY = y + 14;
  drawField('ORDER ID', `#${order.id}`, leftX, rowY, true);
  drawField('ORDER NO', order.order_no, rightX, rowY, true);
  rowY += 30;
  drawField('DATE', new Date(order.createdAt).toLocaleString(), leftX, rowY);
  drawField('CUSTOMER', order.User?.name || 'Walk-in', rightX, rowY);
  rowY += 30;
  drawField('EMAIL', order.User?.email || '—', leftX, rowY);

  textAt(doc, 'STATUS', rightX, rowY, { fillColor: COLORS.muted, font: 'Helvetica', fontSize: 7 });
  const badge = statusColors(order.status);
  const statusW = doc.widthOfString(orderStatus) + 18;
  const statusY = rowY + 9;
  doc.roundedRect(rightX, statusY, statusW, 16, 8).fill(badge.bg);
  textAt(doc, orderStatus, rightX, statusY + 4, {
    width: statusW,
    align: 'center',
    fillColor: badge.text,
    font: 'Helvetica-Bold',
    fontSize: 8
  });

  if (hasNotes) {
    rowY += 30;
    drawField('NOTES', order.notes, leftX, rowY);
  }

  doc.restore();
  return y + boxH + 18;
};

const drawItemsTable = (doc, y, products) => {
  const w = contentWidth();
  const col = {
    item: MARGIN + 10,
    qty: MARGIN + w * 0.56,
    unit: MARGIN + w * 0.66,
    total: MARGIN + w * 0.8
  };

  const headerH = 26;
  doc.save();
  doc.roundedRect(MARGIN, y, w, headerH, 6).fill(COLORS.primary);
  const headerTextY = y + 9;
  textAt(doc, 'ITEM', col.item, headerTextY, { fillColor: COLORS.white, font: 'Helvetica-Bold', fontSize: 8 });
  textAt(doc, 'QTY', col.qty, headerTextY, { fillColor: COLORS.white, font: 'Helvetica-Bold', fontSize: 8 });
  textAt(doc, 'UNIT', col.unit, headerTextY, { fillColor: COLORS.white, font: 'Helvetica-Bold', fontSize: 8 });
  textAt(doc, 'TOTAL', col.total, headerTextY, { fillColor: COLORS.white, font: 'Helvetica-Bold', fontSize: 8 });
  doc.restore();

  let rowY = y + headerH;
  (products || []).forEach((p, index) => {
    const line = p.OrderItem || p.order_items;
    const qty = line?.quantity || 0;
    const price = parseFloat(line?.unit_price || 0);
    const lineTotal = qty * price;
    const desc = p.description ? String(p.description).slice(0, 60) : '';
    const rowH = desc ? 38 : 28;
    const bg = index % 2 === 0 ? COLORS.white : COLORS.rowAlt;

    doc.rect(MARGIN, rowY, w, rowH).fill(bg);
    doc.moveTo(MARGIN, rowY + rowH).lineTo(MARGIN + w, rowY + rowH).strokeColor(COLORS.border).lineWidth(0.5).stroke();

    doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(8)
      .text(p.name || 'Item', col.item, rowY + 7, { width: w * 0.46, lineBreak: false, ellipsis: true });
    textAt(doc, p.item_code || 'N/A', col.item, rowY + (desc ? 18 : 16), {
      fillColor: COLORS.muted,
      font: 'Helvetica',
      fontSize: 7
    });
    if (desc) {
      textAt(doc, desc, col.item, rowY + 27, { fillColor: COLORS.muted, font: 'Helvetica', fontSize: 6 });
    }

    textAt(doc, String(qty), col.qty, rowY + 10, { fillColor: COLORS.text, font: 'Helvetica', fontSize: 8 });
    textAt(doc, money(price), col.unit, rowY + 10, { fillColor: COLORS.text, font: 'Helvetica', fontSize: 8 });
    textAt(doc, money(lineTotal), col.total, rowY + 10, { fillColor: COLORS.text, font: 'Helvetica-Bold', fontSize: 8 });

    rowY += rowH;
  });

  doc.roundedRect(MARGIN, y, w, rowY - y, 8).strokeColor(COLORS.border).lineWidth(1).stroke();
  return rowY + 16;
};

const drawTotals = (doc, y, totals) => {
  const w = contentWidth();
  const boxW = 210;
  const boxX = MARGIN + w - boxW;
  const boxH = 58;

  doc.save();
  doc.roundedRect(boxX, y, boxW, boxH, 8).fillAndStroke('#f1f5f9', COLORS.border);
  textAt(doc, 'Subtotal', boxX + 14, y + 12, { fillColor: COLORS.muted, font: 'Helvetica', fontSize: 8 });
  textAt(doc, money(totals.subtotal), boxX + 14, y + 12, {
    width: boxW - 28,
    align: 'right',
    fillColor: COLORS.text,
    font: 'Helvetica-Bold',
    fontSize: 9
  });
  doc.moveTo(boxX + 10, y + 30).lineTo(boxX + boxW - 10, y + 30).strokeColor(COLORS.border).stroke();
  textAt(doc, 'Grand Total', boxX + 14, y + 36, { fillColor: COLORS.primary, font: 'Helvetica-Bold', fontSize: 10 });
  textAt(doc, money(totals.grand_total), boxX + 14, y + 36, {
    width: boxW - 28,
    align: 'right',
    fillColor: COLORS.primary,
    font: 'Helvetica-Bold',
    fontSize: 11
  });
  doc.restore();

  return y + boxH + 20;
};

const drawFooter = (doc, y, order) => {
  const w = contentWidth();

  doc.moveTo(MARGIN, y).lineTo(MARGIN + w, y).strokeColor(COLORS.border).lineWidth(0.5).stroke();

  if (order.status === 'Pending') {
    doc.roundedRect(MARGIN, y + 10, w, 24, 6).fill(COLORS.warningBg);
    textAt(doc, 'Your order is being processed. You will receive another email when it is completed.', MARGIN + 10, y + 18, {
      width: w - 20,
      align: 'center',
      fillColor: COLORS.warning,
      font: 'Helvetica-Bold',
      fontSize: 7
    });
  } else {
    textAt(doc, 'Thank you for shopping with OfficeOne Store!', MARGIN, y + 14, {
      width: w,
      align: 'center',
      fillColor: COLORS.muted,
      font: 'Helvetica',
      fontSize: 9
    });
    textAt(doc, 'For questions about this order, contact us at noreply@officeone.com', MARGIN, y + 28, {
      width: w,
      align: 'center',
      fillColor: COLORS.muted,
      font: 'Helvetica',
      fontSize: 7
    });
  }
};

const generateReceipt = (order, totals, options = {}) => {
  const docTitle = options.title || (order.status === 'Completed' ? 'ORDER RECEIPT' : 'ORDER CONFIRMATION');
  const orderStatus = statusLabel(order.status);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      autoFirstPage: true,
      bufferPages: false
    });
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    let y = drawHeader(doc, docTitle);
    y = drawSectionTitle(doc, y, 'Order Summary');
    y = drawInfoBox(doc, y, order, orderStatus);
    y = drawSectionTitle(doc, y, 'Items Purchased');
    y = drawItemsTable(doc, y, order.Products || []);
    y = drawTotals(doc, y, totals);
    drawFooter(doc, y, order);

    doc.end();
  });
};

module.exports = { generateReceipt, statusLabel };
