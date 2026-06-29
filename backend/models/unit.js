module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Unit', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    abbreviation: { type: DataTypes.STRING, allowNull: true },
    deleted_at: { type: DataTypes.DATE, allowNull: true }
  }, { tableName: 'units', timestamps: true });
};
