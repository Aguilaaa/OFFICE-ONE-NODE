const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const db = {};

db.User = require('./user')(sequelize, DataTypes);
db.Product = require('./product')(sequelize, DataTypes);
db.ProductPhoto = require('./productPhoto')(sequelize, DataTypes);
db.Order = require('./order')(sequelize, DataTypes);
db.OrderItem = require('./orderItem')(sequelize, DataTypes);
db.Category = require('./category')(sequelize, DataTypes);

db.Product.hasMany(db.ProductPhoto, { foreignKey: 'product_id', onDelete: 'CASCADE' });
db.ProductPhoto.belongsTo(db.Product, { foreignKey: 'product_id' });

db.User.hasMany(db.Order, { foreignKey: 'created_by' });
db.Order.belongsTo(db.User, { foreignKey: 'created_by' });

db.Order.belongsToMany(db.Product, {
  through: db.OrderItem,
  foreignKey: 'order_id',
  otherKey: 'product_id'
});
db.Product.belongsToMany(db.Order, {
  through: db.OrderItem,
  foreignKey: 'product_id',
  otherKey: 'order_id'
});

db.OrderItem.belongsTo(db.Order, { foreignKey: 'order_id' });
db.OrderItem.belongsTo(db.Product, { foreignKey: 'product_id' });

db.sequelize = sequelize;
db.Sequelize = require('sequelize');

module.exports = db;
