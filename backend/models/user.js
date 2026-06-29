module.exports = (sequelize, DataTypes) => {
  return sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('admin', 'customer'), defaultValue: 'customer' },
    profile_image: { type: DataTypes.STRING, allowNull: true },
    token: { type: DataTypes.STRING(500), allowNull: true },
    is_active: { type: DataTypes.TINYINT, defaultValue: 1 },
    deleted_at: { type: DataTypes.DATE, allowNull: true }
  }, { tableName: 'users', timestamps: true });
};
