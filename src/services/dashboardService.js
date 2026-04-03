const pool = require('../db');

const getSummary = async () => {
  const { rows } = await pool.query(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expenses,
      COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE -amount END), 0) AS net_balance
    FROM financial_records
    WHERE deleted_at IS NULL
  `);

  return rows[0];
};

const getCategoryTotals = async () => {
  const { rows } = await pool.query(`
    SELECT
      category,
      type,
      SUM(amount)   AS total,
      COUNT(*)::int AS count
    FROM financial_records
    WHERE deleted_at IS NULL
    GROUP BY category, type
    ORDER BY total DESC
  `);

  return rows;
};

const getMonthlyTrends = async () => {
  const { rows } = await pool.query(`
    SELECT
      TO_CHAR(date, 'YYYY-MM') AS month,
      COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses,
      COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE -amount END), 0) AS net
    FROM financial_records
    WHERE deleted_at IS NULL
      AND date >= NOW() - INTERVAL '12 months'
    GROUP BY month
    ORDER BY month ASC
  `);

  return rows;
};

const getWeeklyTrends = async () => {
  const { rows } = await pool.query(`
    SELECT
      TO_CHAR(DATE_TRUNC('week', date), 'YYYY-MM-DD') AS week_start,
      COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses,
      COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE -amount END), 0) AS net
    FROM financial_records
    WHERE deleted_at IS NULL
      AND date >= NOW() - INTERVAL '12 weeks'
    GROUP BY week_start
    ORDER BY week_start ASC
  `);

  return rows;
};

const getRecentActivity = async (limit = 10) => {
  const { rows } = await pool.query(
    `SELECT r.id, r.amount, r.type, r.category, r.date, r.notes, r.created_at,
            u.name AS created_by_name
     FROM financial_records r
     JOIN users u ON u.id = r.created_by
     WHERE r.deleted_at IS NULL
     ORDER BY r.created_at DESC
     LIMIT $1`,
    [limit]
  );

  return rows;
};

module.exports = { getSummary, getCategoryTotals, getMonthlyTrends, getWeeklyTrends, getRecentActivity };
