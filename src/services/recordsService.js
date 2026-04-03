const pool = require('../db');

const listRecords = async ({ type, category, dateFrom, dateTo, page = 1, limit = 20 }) => {
  const conditions = ['deleted_at IS NULL'];
  const params = [];

  if (type) {
    params.push(type);
    conditions.push(`type = $${params.length}`);
  }
  if (category) {
    params.push(`%${category}%`);
    conditions.push(`category ILIKE $${params.length}`);
  }
  if (dateFrom) {
    params.push(dateFrom);
    conditions.push(`date >= $${params.length}`);
  }
  if (dateTo) {
    params.push(dateTo);
    conditions.push(`date <= $${params.length}`);
  }

  const where = conditions.join(' AND ');
  const offset = (page - 1) * limit;

  params.push(limit);
  params.push(offset);

  const { rows } = await pool.query(
    `SELECT r.id, r.amount, r.type, r.category, r.date, r.notes, r.created_at,
            u.name AS created_by_name
     FROM financial_records r
     JOIN users u ON u.id = r.created_by
     WHERE ${where}
     ORDER BY r.date DESC, r.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  // Count query without limit/offset
  const countParams = params.slice(0, params.length - 2);
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM financial_records WHERE ${where}`,
    countParams
  );
  const total = parseInt(countResult.rows[0].count, 10);

  return { records: rows, total, page, limit };
};

const getRecordById = async (id) => {
  const { rows } = await pool.query(
    `SELECT r.*, u.name AS created_by_name
     FROM financial_records r
     JOIN users u ON u.id = r.created_by
     WHERE r.id = $1 AND r.deleted_at IS NULL`,
    [id]
  );

  if (!rows.length) {
    const err = new Error('Record not found');
    err.status = 404;
    throw err;
  }

  return rows[0];
};

const createRecord = async ({ amount, type, category, date, notes }, userId) => {
  const { rows } = await pool.query(
    `INSERT INTO financial_records (amount, type, category, date, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [amount, type, category, date, notes || null, userId]
  );

  return rows[0];
};

const updateRecord = async (id, { amount, type, category, date, notes }) => {
  const fields = [];
  const params = [];

  if (amount !== undefined) { params.push(amount);    fields.push(`amount = $${params.length}`); }
  if (type !== undefined)   { params.push(type);      fields.push(`type = $${params.length}`); }
  if (category !== undefined) { params.push(category); fields.push(`category = $${params.length}`); }
  if (date !== undefined)   { params.push(date);      fields.push(`date = $${params.length}`); }
  if (notes !== undefined)  { params.push(notes);     fields.push(`notes = $${params.length}`); }

  if (!fields.length) {
    const err = new Error('No fields provided for update');
    err.status = 400;
    throw err;
  }

  params.push(id);
  const { rows } = await pool.query(
    `UPDATE financial_records
     SET ${fields.join(', ')}
     WHERE id = $${params.length} AND deleted_at IS NULL
     RETURNING *`,
    params
  );

  if (!rows.length) {
    const err = new Error('Record not found');
    err.status = 404;
    throw err;
  }

  return rows[0];
};

// Soft delete — sets deleted_at instead of removing the row
const deleteRecord = async (id) => {
  const { rows } = await pool.query(
    `UPDATE financial_records SET deleted_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [id]
  );

  if (!rows.length) {
    const err = new Error('Record not found');
    err.status = 404;
    throw err;
  }
};

module.exports = { listRecords, getRecordById, createRecord, updateRecord, deleteRecord };
