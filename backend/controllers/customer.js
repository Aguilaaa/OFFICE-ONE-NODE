const db = require('../models');
const Customer = db.Customer;const { Op } = require('sequelize');
const { trashedWhere, softDeleteRow, restoreRow } = require('../utils/softDelete');

exports.getAllCustomers = async (req, res) => {
  try {
    const { search, trashed } = req.query;
    const where = { ...trashedWhere(trashed) };    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { customer_code: { [Op.like]: `%${search}%` } }
      ];
    }
    const customers = await Customer.findAll({ where, order: [['createdAt', 'DESC']] });
    return res.status(200).json({ rows: customers });
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching customers' });
  }
};

exports.getSingleCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOne({ where: { id: req.params.id, deleted_at: null } });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    return res.status(200).json({ success: true, result: customer });
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching customer' });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const customer = await Customer.create({ ...req.body, is_active: req.body.is_active ?? 1 });
    return res.status(201).json({ success: true, customer });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Customer code already exists' });
    }
    return res.status(500).json({ error: 'Error creating customer' });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    await Customer.update(req.body, { where: { id: req.params.id } });
    return res.status(200).json({ success: true });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Customer code already exists' });
    }
    return res.status(500).json({ error: 'Error updating customer' });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    const result = await softDeleteRow(customer);
    if (result.status !== 200) return res.status(result.status).json({ error: result.error });
    return res.status(200).json({ success: true, message: 'Customer moved to trash' });
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting customer' });
  }
};

exports.restoreCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    const result = await restoreRow(customer);
    if (result.status !== 200) return res.status(result.status).json({ error: result.error });
    return res.status(200).json({ success: true, message: 'Customer restored' });
  } catch (err) {
    return res.status(500).json({ error: 'Error restoring customer' });
  }
};