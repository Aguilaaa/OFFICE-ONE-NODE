const { Op } = require('sequelize');

const isTrashed = (trashed) => trashed === '1' || trashed === 'true';

exports.trashedWhere = (trashed) => (
  isTrashed(trashed)
    ? { deleted_at: { [Op.ne]: null } }
    : { deleted_at: null }
);

exports.softDeleteRow = async (row) => {
  if (!row) return { status: 404, error: 'Record not found' };
  if (row.deleted_at) return { status: 400, error: 'Already deleted' };
  await row.update({ deleted_at: new Date() });
  return { status: 200 };
};

exports.restoreRow = async (row, extra = {}) => {
  if (!row) return { status: 404, error: 'Record not found' };
  if (!row.deleted_at) return { status: 400, error: 'Record is not deleted' };
  await row.update({ deleted_at: null, ...extra });
  return { status: 200 };
};
