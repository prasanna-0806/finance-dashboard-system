const pool = require('../db');

const listUsers = async ({ page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;

  const { rows } = await pool.query(
    `SELECT id, name, email, role, is_active, created_at
     FROM users
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  const countResult = await pool.query('SELECT COUNT(*) FROM users');
  const total = parseInt(countResult.rows[0].count, 10);

  return { users: rows, total, page, limit };
};

const getUserById = async (id) => {
  const { rows } = await pool.query(
    'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = $1',
    [id]
  );

  if (!rows.length) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  return rows[0];
};

const updateUserRole = async (id, role) => {
  const { rows } = await pool.query(
    `UPDATE users SET role = $1 WHERE id = $2
     RETURNING id, name, email, role, is_active`,
    [role, id]
  );

  if (!rows.length) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  return rows[0];
};

const setUserStatus = async (id, is_active) => {
  const { rows } = await pool.query(
    `UPDATE users SET is_active = $1 WHERE id = $2
     RETURNING id, name, email, role, is_active`,
    [is_active, id]
  );

  if (!rows.length) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  return rows[0];
};

module.exports = { listUsers, getUserById, updateUserRole, setUserStatus };
