const db = require('../models');
const { sendOrderEmail, queueOrderEmail, resolveEmailType, buildReceiptAttachment } = require('../utils/orderEmail');
const { getOrderTotals, attachTotals, getIncomeByDateRange } = require('../utils/orderQuery');
const { trashedWhere, softDeleteRow, restoreRow } = require('../utils/softDelete');
const { Op } = require('sequelize');

const includeOrder = [
  { model: db.User, attributes: ['name', 'email'] },
  {
    model: db.Product,
    through: { attributes: ['quantity', 'unit_price'] },
    attributes: ['id', 'name', 'item_code', 'description', 'unit']
  }
];
const VALID_STATUSES = ['Pending', 'Completed', 'Cancelled'];
const normalizeStatus = (status) => (status === 'Draft' ? 'Pending' : status);
const rollbackIfOpen = async (dbTx) => {
  if (dbTx && !dbTx.finished) await dbTx.rollback();
};

const saveItems = async (order, items, options = {}) => {
  await db.OrderItem.destroy({ where: { order_id: order.id }, transaction: options.transaction });
  for (const item of items) {
    await order.addProduct(item.product_id, {
      through: { quantity: item.quantity, unit_price: item.unit_price },
      transaction: options.transaction
    });
  }
};

const getOrderLineItems = async (orderId, options = {}) => {
  return db.OrderItem.findAll({
    where: { order_id: orderId },
    transaction: options.transaction
  });
};

const adjustStock = async (items, direction, options = {}) => {
  for (const item of items) {
    const product = await db.Product.findByPk(item.product_id, {
      transaction: options.transaction,
      lock: options.transaction ? options.transaction.LOCK.UPDATE : undefined
    });
    if (!product || product.category !== 'Product') continue;

    const quantity = parseInt(item.quantity, 10);
    const currentStock = parseInt(product.stock_quantity || 0, 10);
    if (direction === 'deduct') {
      if (currentStock < quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      await product.update({ stock_quantity: currentStock - quantity }, { transaction: options.transaction });
    } else {
      await product.update({ stock_quantity: currentStock + quantity }, { transaction: options.transaction });
    }
  }
};

const syncStockForStatus = async (order, nextStatus, options = {}) => {
  const isCompleted = nextStatus === 'Completed';
  const alreadyDeducted = Number(order.stock_deducted) === 1;
  const items = await getOrderLineItems(order.id, options);

  if (isCompleted && !alreadyDeducted) {
    await adjustStock(items, 'deduct', options);
    await order.update({ stock_deducted: 1 }, { transaction: options.transaction });
  }

  if (!isCompleted && alreadyDeducted) {
    await adjustStock(items, 'restore', options);
    await order.update({ stock_deducted: 0 }, { transaction: options.transaction });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await db.Order.findAll({
      where: { created_by: req.body.user.id, deleted_at: null },
      include: includeOrder,
      order: [['createdAt', 'DESC']]
    });
    const rows = await attachTotals(db.sequelize, orders);
    return res.status(200).json({ rows });
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching orders' });
  }
};

exports.getMyOrder = async (req, res) => {
  try {
    const order = await db.Order.findOne({
      where: { id: req.params.id, created_by: req.body.user.id, deleted_at: null },
      include: includeOrder
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const result = order.toJSON();
    Object.assign(result, await getOrderTotals(db.sequelize, order));
    return res.status(200).json({ success: true, result });
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching order' });
  }
};

const sendReceiptPdf = async (res, order) => {
  const totals = await getOrderTotals(db.sequelize, order);
  const emailType = resolveEmailType(order.status);
  const { pdfBuffer, filename } = await buildReceiptAttachment(order, totals, emailType);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(pdfBuffer);
};

exports.getMyOrderReceipt = async (req, res) => {
  try {
    const order = await db.Order.findOne({
      where: { id: req.params.id, created_by: req.body.user.id, deleted_at: null },
      include: includeOrder
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    return await sendReceiptPdf(res, order);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Error generating receipt PDF' });
  }
};

exports.getOrderReceipt = async (req, res) => {
  try {
    const order = await db.Order.findOne({
      where: { id: req.params.id, ...trashedWhere(req.query.trashed) },
      include: includeOrder
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    return await sendReceiptPdf(res, order);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Error generating receipt PDF' });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const { status, start_date, end_date, trashed } = req.query;
    const where = { ...trashedWhere(trashed) };
    if (status) where.status = status;
    if (start_date && end_date) {
      where.createdAt = { [Op.between]: [new Date(start_date), new Date(end_date + 'T23:59:59')] };
    }
    const orders = await db.Order.findAll({ where, include: includeOrder, order: [['createdAt', 'DESC']] });
    const rows = await attachTotals(db.sequelize, orders);
    return res.status(200).json({ rows });
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching orders' });
  }
};

const validateCheckoutStock = async (items, options = {}) => {
  if (!items || items.length === 0) throw new Error('Cart is empty');

  for (const item of items) {
    const product = await db.Product.findByPk(item.product_id, {
      transaction: options.transaction,
      lock: options.transaction ? options.transaction.LOCK.UPDATE : undefined
    });
    if (!product || product.deleted_at || !product.is_active) {
      throw new Error(`${product?.name || 'An item'} is no longer available.`);
    }
    if (product.category !== 'Product') continue;

    const quantity = parseInt(item.quantity, 10);
    const stock = parseInt(product.stock_quantity || 0, 10);
    if (stock <= 0) throw new Error(`${product.name} is out of stock.`);
    if (quantity > stock) throw new Error(`Only ${stock} left in stock for ${product.name}.`);
  }
};

exports.checkout = async (req, res) => {
  const dbTx = await db.sequelize.transaction();
  try {
    const { notes, items } = req.body;
    const user = await db.User.findByPk(req.body.user.id, { transaction: dbTx });
    if (!user || user.role === 'admin') {
      await rollbackIfOpen(dbTx);
      return res.status(403).json({ error: 'Admin accounts cannot use cart checkout' });
    }
    await validateCheckoutStock(items || [], { transaction: dbTx });
    const order = await db.Order.create({
      order_no: `WEB-${Date.now()}-${req.body.user.id}`,
      notes: notes || null,
      status: 'Pending',
      stock_deducted: 0,
      created_by: req.body.user.id
    }, { transaction: dbTx });
    await saveItems(order, items || [], { transaction: dbTx });
    await dbTx.commit();
    const full = await db.Order.findByPk(order.id, { include: includeOrder });
    const totals = await getOrderTotals(db.sequelize, full);

    let emailSent = false;
    try {
      emailSent = await sendOrderEmail(full, totals, 'confirmation');
    } catch (mailErr) {
      console.error('Order confirmation email failed:', mailErr.message);
    }

    return res.status(201).json({
      success: true,
      emailSent,
      message: emailSent
        ? 'Order placed. A confirmation email with PDF has been sent to your inbox.'
        : 'Order placed. It will stay in processing until an admin marks it completed.',
      order: { ...full.toJSON(), ...totals }
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      await rollbackIfOpen(dbTx);
      return res.status(409).json({ error: 'Order number conflict. Please try again.' });
    }
    await rollbackIfOpen(dbTx);
    const msg = err.message || 'Error placing order';
    if (/stock|available|empty/i.test(msg)) {
      return res.status(400).json({ error: msg });
    }
    return res.status(500).json({ error: msg });
  }
};

exports.createOrder = async (req, res) => {
  const dbTx = await db.sequelize.transaction();
  try {
    const { order_no, notes, items, status } = req.body;
    const nextStatus = VALID_STATUSES.includes(status) ? status : 'Pending';
    const order = await db.Order.create({
      order_no,
      notes,
      status: nextStatus,
      created_by: req.body.user?.id
    }, { transaction: dbTx });
    await saveItems(order, items || [], { transaction: dbTx });
    await syncStockForStatus(order, nextStatus, { transaction: dbTx });
    await dbTx.commit();
    const totals = await getOrderTotals(db.sequelize, order);
    return res.status(201).json({ success: true, order: { ...order.toJSON(), ...totals } });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      await rollbackIfOpen(dbTx);
      return res.status(409).json({ error: 'Order number already exists' });
    }
    await rollbackIfOpen(dbTx);
    return res.status(500).json({ error: err.message || 'Error creating order' });
  }
};

exports.updateOrder = async (req, res) => {
  const dbTx = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const { notes, items, status } = req.body;
    if (status && !VALID_STATUSES.includes(status)) {
      await rollbackIfOpen(dbTx);
      return res.status(400).json({ error: 'Invalid order status' });
    }
    const order = await db.Order.findByPk(id, { include: includeOrder, transaction: dbTx });
    if (!order) {
      await rollbackIfOpen(dbTx);
      return res.status(404).json({ error: 'Order not found' });
    }

    const previousStatus = normalizeStatus(order.status);
    const nextStatus = status ? normalizeStatus(status) : previousStatus;
    const statusChanged = Boolean(status) && nextStatus !== previousStatus;
    const canUpdateItems = previousStatus !== 'Completed';
    const updateData = { notes };
    if (status) updateData.status = status;
    if (canUpdateItems && items) await saveItems(order, items, { transaction: dbTx });

    await order.update(updateData, { transaction: dbTx });
    await syncStockForStatus(order, status || previousStatus, { transaction: dbTx });
    await dbTx.commit();

    if (statusChanged) {
      const emailType = resolveEmailType(nextStatus, previousStatus);
      queueOrderEmail(id, emailType, previousStatus);
    }

    return res.status(200).json({
      success: true,
      status: nextStatus,
      emailQueued: statusChanged
    });
  } catch (err) {
    await rollbackIfOpen(dbTx);
    return res.status(500).json({ error: err.message || 'Error updating order' });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const order = await db.Order.findByPk(req.params.id);
    const result = await softDeleteRow(order);
    if (result.status !== 200) return res.status(result.status).json({ error: result.error });
    return res.status(200).json({ success: true, message: 'Order moved to trash' });
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting order' });
  }
};

exports.restoreOrder = async (req, res) => {
  try {
    const order = await db.Order.findByPk(req.params.id);
    const result = await restoreRow(order);
    if (result.status !== 200) return res.status(result.status).json({ error: result.error });
    return res.status(200).json({ success: true, message: 'Order restored' });
  } catch (err) {
    return res.status(500).json({ error: 'Error restoring order' });
  }
};

exports.getIncomeReport = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const result = await getIncomeByDateRange(db.sequelize, start_date, end_date);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ error: 'Error computing income' });
  }
};
