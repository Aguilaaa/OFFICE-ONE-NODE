const db = require('../models');
const {
  getDashboardRevenue,
  getMonthlySales,
  getRecentOrderTotals
} = require('../utils/orderQuery');

exports.getDashboardStats = async (req, res) => {
  try {
    const totalProducts = await db.Product.count({ where: { deleted_at: null, is_active: 1 } });
    const totalUsers = await db.User.count({ where: { deleted_at: null } });
    const totalTransactions = await db.Transaction.count({ where: { deleted_at: null } });
    const totalRevenue = await getDashboardRevenue(db.sequelize);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentOrders = await getRecentOrderTotals(db.sequelize, sevenDaysAgo);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthlySales = await getMonthlySales(db.sequelize, sixMonthsAgo);

    const categorySales = await db.sequelize.query(`
      SELECT p.category, SUM(ti.quantity * ti.unit_price) AS amount
      FROM transaction_items ti
      JOIN products p ON p.id = ti.product_id
      GROUP BY p.category
    `, { type: db.Sequelize.QueryTypes.SELECT });

    return res.status(200).json({
      success: true,
      stats: { totalProducts, totalUsers, totalTransactions, totalRevenue },
      recentOrders,
      monthlySales,
      categorySales
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error fetching dashboard stats' });
  }
};
