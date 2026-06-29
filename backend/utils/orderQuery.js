const { QueryTypes } = require('sequelize');

const getSubtotalSql = `
  SELECT COALESCE(SUM(quantity * unit_price), 0) AS subtotal
  FROM transaction_items WHERE transaction_id = ?
`;

async function getOrderTotals(sequelize, transaction) {
  const [row] = await sequelize.query(getSubtotalSql, {
    replacements: [transaction.id],
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
    SELECT COUNT(*) AS transaction_count,
      COALESCE(SUM(
        (SELECT COALESCE(SUM(quantity * unit_price), 0) FROM transaction_items ti WHERE ti.transaction_id = t.id)
      ), 0) AS total_income
    FROM transactions t
    WHERE t.status = 'Completed'
      AND t.deleted_at IS NULL
      AND t.createdAt BETWEEN ? AND ?
  `, {
    replacements: [startDate, endDate + ' 23:59:59'],
    type: QueryTypes.SELECT
  });
  return {
    total_income: parseFloat(row.total_income),
    transaction_count: parseInt(row.transaction_count, 10)
  };
}

async function getDashboardRevenue(sequelize) {
  const [row] = await sequelize.query(`
    SELECT COALESCE(SUM(
      (SELECT COALESCE(SUM(quantity * unit_price), 0) FROM transaction_items ti WHERE ti.transaction_id = t.id)
    ), 0) AS total_revenue
    FROM transactions t WHERE t.status = 'Completed' AND t.deleted_at IS NULL
  `, { type: QueryTypes.SELECT });
  return parseFloat(row.total_revenue);
}

async function getMonthlySales(sequelize, since) {
  return sequelize.query(`
    SELECT DATE_FORMAT(t.createdAt, '%Y-%m') AS month,
      SUM(
        (SELECT COALESCE(SUM(quantity * unit_price), 0) FROM transaction_items ti WHERE ti.transaction_id = t.id)
      ) AS revenue
    FROM transactions t
    WHERE t.status = 'Completed' AND t.deleted_at IS NULL AND t.createdAt >= ?
    GROUP BY DATE_FORMAT(t.createdAt, '%Y-%m')
    ORDER BY month
  `, { replacements: [since], type: QueryTypes.SELECT });
}

async function getRecentOrderTotals(sequelize, since) {
  return sequelize.query(`
    SELECT t.id, t.status, t.createdAt,
      (SELECT COALESCE(SUM(quantity * unit_price), 0) FROM transaction_items ti WHERE ti.transaction_id = t.id)
        AS grand_total
    FROM transactions t
    WHERE t.deleted_at IS NULL AND t.createdAt >= ?
    ORDER BY t.createdAt DESC
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
