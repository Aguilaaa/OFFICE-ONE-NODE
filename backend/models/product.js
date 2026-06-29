module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Product', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    item_code: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.ENUM('Product', 'Service'), defaultValue: 'Product' },
    unit: { type: DataTypes.STRING, allowNull: true },
    unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    stock_quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_active: { type: DataTypes.TINYINT, defaultValue: 1 },
    image_url: { type: DataTypes.STRING, allowNull: true },
    deleted_at: { type: DataTypes.DATE, allowNull: true }
  }, { tableName: 'products', timestamps: true });
};
