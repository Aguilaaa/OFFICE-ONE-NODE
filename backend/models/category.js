module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Category', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    type: { type: DataTypes.ENUM('Product', 'Service', 'Expense'), allowNull: false },
    deleted_at: { type: DataTypes.DATE, allowNull: true }
  }, { tableName: 'categories', timestamps: true });
};
