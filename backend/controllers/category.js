const db = require('../models');
const { trashedWhere, softDeleteRow, restoreRow } = require('../utils/softDelete');

exports.getAll = async (req, res) => {
  try {
    const rows = await db.Category.findAll({
      where: trashedWhere(req.query.trashed),
      order: [['type', 'ASC'], ['name', 'ASC']]
    });
    return res.status(200).json({ rows });
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching categories' });
  }
};

exports.create = async (req, res) => {
  try {
    const row = await db.Category.create(req.body);
    return res.status(201).json({ success: true, category: row });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Category name already exists' });
    }
    return res.status(500).json({ error: 'Error creating category' });
  }
};

exports.update = async (req, res) => {
  try {
    await db.Category.update(req.body, { where: { id: req.params.id, deleted_at: null } });
    return res.status(200).json({ success: true });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Category name already exists' });
    }
    return res.status(500).json({ error: 'Error updating category' });
  }
};

exports.delete = async (req, res) => {
  try {
    const row = await db.Category.findByPk(req.params.id);
    const result = await softDeleteRow(row);
    if (result.status !== 200) return res.status(result.status).json({ error: result.error });
    return res.status(200).json({ success: true, message: 'Category moved to trash' });
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting category' });
  }
};

exports.restore = async (req, res) => {
  try {
    const row = await db.Category.findByPk(req.params.id);
    const result = await restoreRow(row);
    if (result.status !== 200) return res.status(result.status).json({ error: result.error });
    return res.status(200).json({ success: true, message: 'Category restored' });
  } catch (err) {
    return res.status(500).json({ error: 'Error restoring category' });
  }
};
