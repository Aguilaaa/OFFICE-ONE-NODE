module.exports = (sequelize, DataTypes) => {
  return sequelize.define('ProductPhoto', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER, allowNull: false },
    photo_path: { type: DataTypes.STRING, allowNull: false },
    is_main: { type: DataTypes.TINYINT, defaultValue: 0 }
  }, { tableName: 'product_photos', timestamps: true });
};
