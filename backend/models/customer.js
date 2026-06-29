module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Customer', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    customer_code: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    contact_no: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.TINYINT, defaultValue: 1 },
    deleted_at: { type: DataTypes.DATE, allowNull: true }
  }, { tableName: 'customers', timestamps: true });
};
