const { QueryTypes } = require('sequelize');

const getSubtotalSql = `
  SELECT COALESCE(SUM(quantity * unit_price), 0) AS subtotal
  FROM order_items WHERE order_id = ?
`;

async function getOrderTotals(sequelize, order) {
  const [row] = await sequelize.query(getSubtotalSql, {
    replacements: [order.id],
    type: QueryTypes.SELECT
  });
  const subtotal = parseFloat(row.subtotal);
  return { subtotal, grand_total: subtotal };
}

async function attachTotals(sequelize, list) {
  const rows = await Promise.all(list.map(async (t) => {
    const json = t.toJSON ? t.toJSON() : { ...t };
    Object.assign(json, await getOrderTotals(sequelize, json));
    return json;
  }));
  return rows;
}

async function getIncomeByDateRange(sequelize, startDate, endDate) {
  const [row] = await sequelize.query(`
    SELECT COUNT(*) AS order_count,
      COALESCE(SUM(
        (SELECT COALESCE(SUM(quantity * unit_price), 0) FROM order_items oi WHERE oi.order_id = o.id)
      ), 0) AS total_income
    FROM orders o
    WHERE o.status = 'Completed'
      AND o.deleted_at IS NULL
      AND o.createdAt BETWEEN ? AND ?
  `, {
    replacements: [startDate, endDate + ' 23:59:59'],
    type: QueryTypes.SELECT
  });
  return {
    total_income: parseFloat(row.total_income),
    order_count: parseInt(row.order_count, 10)
  };
}

async function getDashboardRevenue(sequelize) {
  const [row] = await sequelize.query(`
    SELECT COALESCE(SUM(
      (SELECT COALESCE(SUM(quantity * unit_price), 0) FROM order_items oi WHERE oi.order_id = o.id)
    ), 0) AS total_revenue
    FROM orders o WHERE o.status = 'Completed' AND o.deleted_at IS NULL
  `, { type: QueryTypes.SELECT });
  return parseFloat(row.total_revenue);
}

async function getMonthlySales(sequelize, since) {
  return sequelize.query(`
    SELECT DATE_FORMAT(o.createdAt, '%Y-%m') AS month,
      SUM(
        (SELECT COALESCE(SUM(quantity * unit_price), 0) FROM order_items oi WHERE oi.order_id = o.id)
      ) AS revenue
    FROM orders o
    WHERE o.status = 'Completed' AND o.deleted_at IS NULL AND o.createdAt >= ?
    GROUP BY DATE_FORMAT(o.createdAt, '%Y-%m')
    ORDER BY month
  `, { replacements: [since], type: QueryTypes.SELECT });
}

async function getRecentOrderTotals(sequelize, since) {
  return sequelize.query(`
    SELECT o.id, o.status, o.createdAt,
      (SELECT COALESCE(SUM(quantity * unit_price), 0) FROM order_items oi WHERE oi.order_id = o.id)
        AS grand_total
    FROM orders o
    WHERE o.deleted_at IS NULL AND o.createdAt >= ?
    ORDER BY o.createdAt DESC
  `, { replacements: [since], type: QueryTypes.SELECT });
}

module.exports = {
  getOrderTotals,
  attachTotals,
  getIncomeByDateRange,
  getDashboardRevenue,
  getMonthlySales,
  getRecentOrderTotals
};
