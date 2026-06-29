const db = require('../models');
const sendEmail = require('../utils/sendEmail');
const { generateReceipt } = require('../utils/generatePDF');
const { getOrderTotals, attachTotals, getIncomeByDateRange } = require('../utils/orderQuery');
const { trashedWhere, softDeleteRow, restoreRow } = require('../utils/softDelete');
const { Op } = require('sequelize');

const includeOrder = [
  { model: db.Customer, attributes: ['name', 'customer_code', 'email'] },
  { model: db.User, attributes: ['name'] },
  {
    model: db.Product,
    through: { attributes: ['quantity', 'unit_price'] },
    attributes: ['id', 'name', 'item_code']
  }
];

const saveItems = async (transaction, items) => {
  await db.TransactionItem.destroy({ where: { transaction_id: transaction.id } });
  for (const item of items) {
    await transaction.addProduct(item.product_id, {
      through: { quantity: item.quantity, unit_price: item.unit_price }
    });
  }
};

exports.getAllTransactions = async (req, res) => {
  try {
    const { status, start_date, end_date, trashed } = req.query;
    const where = { ...trashedWhere(trashed) };
    if (status) where.status = status;
    if (start_date && end_date) {
      where.createdAt = { [Op.between]: [new Date(start_date), new Date(end_date + 'T23:59:59')] };
    }
    const transactions = await db.Transaction.findAll({ where, include: includeOrder, order: [['createdAt', 'DESC']] });
    const rows = await attachTotals(db.sequelize, transactions);
    return res.status(200).json({ rows });
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching transactions' });
  }
};

exports.checkout = async (req, res) => {
  try {
    const { notes, discount, items } = req.body;
    const transaction = await db.Transaction.create({
      transaction_no: `WEB-${Date.now()}-${req.body.user.id}`,
      customer_id: null,
      notes: notes || null,
      discount: discount || 0,
      status: 'Completed',
      created_by: req.body.user.id
    });
    await saveItems(transaction, items || []);
    const full = await db.Transaction.findByPk(transaction.id, { include: includeOrder });
    const totals = await getOrderTotals(db.sequelize, full);
    return res.status(201).json({
      success: true,
      transaction: { ...full.toJSON(), ...totals }
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Order number conflict. Please try again.' });
    }
    return res.status(500).json({ error: 'Error placing order' });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const { transaction_no, customer_id, notes, discount, items } = req.body;
    const transaction = await db.Transaction.create({
      transaction_no,
      customer_id: customer_id || null,
      notes,
      discount: discount || 0,
      status: 'Draft',
      created_by: req.body.user?.id
    });
    await saveItems(transaction, items || []);
    const totals = await getOrderTotals(db.sequelize, transaction);
    return res.status(201).json({ success: true, transaction: { ...transaction.toJSON(), ...totals } });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Transaction number already exists' });
    }
    return res.status(500).json({ error: 'Error creating transaction' });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_id, notes, discount, items, status } = req.body;
    const transaction = await db.Transaction.findByPk(id, { include: includeOrder });
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    if (transaction.status === 'Completed' && (items || discount !== undefined)) {
      return res.status(403).json({ error: 'Completed orders can only update notes' });
    }

    const wasDraft = transaction.status === 'Draft';
    const updateData = { customer_id, notes };
    if (wasDraft && discount !== undefined) updateData.discount = discount;
    if (wasDraft && items) await saveItems(transaction, items);
    if (status === 'Completed' && wasDraft) updateData.status = 'Completed';

    await transaction.update(updateData);

    if (status === 'Completed' && wasDraft) {
      const full = await db.Transaction.findByPk(id, { include: includeOrder });
      const totals = await getOrderTotals(db.sequelize, full);
      try {
        const pdfBuffer = await generateReceipt(full, totals);
        if (full.Customer?.email) {
          await sendEmail({
            email: full.Customer.email,
            subject: `Receipt - ${full.transaction_no} | OfficeOne Store`,
            html: `<p>Your order <strong>${full.transaction_no}</strong> is completed. Receipt attached.</p>`,
            attachments: [{ filename: `receipt-${full.transaction_no}.pdf`, content: pdfBuffer }]
          });
        }
      } catch (e) { /* email optional */ }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Error updating transaction' });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await db.Transaction.findByPk(req.params.id);
    const result = await softDeleteRow(transaction);
    if (result.status !== 200) return res.status(result.status).json({ error: result.error });
    return res.status(200).json({ success: true, message: 'Order moved to trash' });
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting transaction' });
  }
};

exports.restoreTransaction = async (req, res) => {
  try {
    const transaction = await db.Transaction.findByPk(req.params.id);
    const result = await restoreRow(transaction);
    if (result.status !== 200) return res.status(result.status).json({ error: result.error });
    return res.status(200).json({ success: true, message: 'Order restored' });
  } catch (err) {
    return res.status(500).json({ error: 'Error restoring transaction' });
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
