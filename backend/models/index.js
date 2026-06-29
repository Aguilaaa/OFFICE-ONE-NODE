const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const db = {};

db.User = require('./user')(sequelize, DataTypes);
db.Product = require('./product')(sequelize, DataTypes);
db.ProductPhoto = require('./productPhoto')(sequelize, DataTypes);
db.Transaction = require('./transaction')(sequelize, DataTypes);
db.TransactionItem = require('./transactionItem')(sequelize, DataTypes);
db.Category = require('./category')(sequelize, DataTypes);

db.Product.hasMany(db.ProductPhoto, { foreignKey: 'product_id', onDelete: 'CASCADE' });
db.ProductPhoto.belongsTo(db.Product, { foreignKey: 'product_id' });

db.User.hasMany(db.Transaction, { foreignKey: 'created_by' });
db.Transaction.belongsTo(db.User, { foreignKey: 'created_by' });

db.Transaction.belongsToMany(db.Product, {
  through: db.TransactionItem,
  foreignKey: 'transaction_id',
  otherKey: 'product_id'
});
db.Product.belongsToMany(db.Transaction, {
  through: db.TransactionItem,
  foreignKey: 'product_id',
  otherKey: 'transaction_id'
});

db.TransactionItem.belongsTo(db.Transaction, { foreignKey: 'transaction_id' });
db.TransactionItem.belongsTo(db.Product, { foreignKey: 'product_id' });

db.sequelize = sequelize;
db.Sequelize = require('sequelize');

module.exports = db;
