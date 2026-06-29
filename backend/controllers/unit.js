const db = require('../models');
const { trashedWhere, softDeleteRow, restoreRow } = require('../utils/softDelete');

exports.getAll = async (req, res) => {
  try {
    const rows = await db.Unit.findAll({
      where: trashedWhere(req.query.trashed),
      order: [['name', 'ASC']]
    });
    return res.status(200).json({ rows });
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching units' });
  }
};

exports.create = async (req, res) => {
  try {
    const row = await db.Unit.create(req.body);
    return res.status(201).json({ success: true, unit: row });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Unit name already exists' });
    }
    return res.status(500).json({ error: 'Error creating unit' });
  }
};

exports.update = async (req, res) => {
  try {
    await db.Unit.update(req.body, { where: { id: req.params.id, deleted_at: null } });
    return res.status(200).json({ success: true });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Unit name already exists' });
    }
    return res.status(500).json({ error: 'Error updating unit' });
  }
};

exports.delete = async (req, res) => {
  try {
    const row = await db.Unit.findByPk(req.params.id);
    const result = await softDeleteRow(row);
    if (result.status !== 200) return res.status(result.status).json({ error: result.error });
    return res.status(200).json({ success: true, message: 'Unit moved to trash' });
  } catch (err) {
    return res.status(500).json({ error: 'Error deleting unit' });
  }
};

exports.restore = async (req, res) => {
  try {
    const row = await db.Unit.findByPk(req.params.id);
    const result = await restoreRow(row);
    if (result.status !== 200) return res.status(result.status).json({ error: result.error });
    return res.status(200).json({ success: true, message: 'Unit restored' });
  } catch (err) {
    return res.status(500).json({ error: 'Error restoring unit' });
  }
};
