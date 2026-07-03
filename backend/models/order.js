module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Order', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    order_no: { type: DataTypes.STRING, allowNull: false, unique: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM('Pending', 'Completed', 'Cancelled'), defaultValue: 'Pending' },
    stock_deducted: { type: DataTypes.TINYINT, defaultValue: 0 },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    deleted_at: { type: DataTypes.DATE, allowNull: true }
  }, { tableName: 'orders', timestamps: true });
};
