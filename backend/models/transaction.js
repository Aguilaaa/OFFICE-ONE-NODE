module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Transaction', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    transaction_no: { type: DataTypes.STRING, allowNull: false, unique: true },
    customer_id: { type: DataTypes.INTEGER, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    discount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    status: { type: DataTypes.ENUM('Draft', 'Completed'), defaultValue: 'Draft' },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    deleted_at: { type: DataTypes.DATE, allowNull: true }
  }, { tableName: 'transactions', timestamps: true });
};
