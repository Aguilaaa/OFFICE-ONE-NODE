module.exports = (sequelize, DataTypes) => {
  return sequelize.define('TransactionItem', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    transaction_id: { type: DataTypes.INTEGER, allowNull: false },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
  }, { tableName: 'transaction_items', timestamps: true });
};
