// recordsService.js — replace your existing file with this
// Adds: search param (searches notes + category), CSV export helper

const pool = require('../db');

async function getRecords({ type, category, dateFrom, dateTo, page = 1, limit = 20, search } = {}) {
  const conditions = ['deleted_at IS NULL'];
  const values = [];
  let i = 1;

  if (type) { conditions.push(`type = $${i++}`); values.push(type); }
  if (category) { conditions.push(`category ILIKE $${i++}`); values.push(`%${category}%`); }
  if (dateFrom) { conditions.push(`date >= $${i++}`); values.push(dateFrom); }
  if (dateTo) { conditions.push(`date <= $${i++}`); values.push(dateTo); }

  if (search) {
    conditions.push(`(notes ILIKE $${i} OR category ILIKE $${i})`);
    values.push(`%${search}%`);
    i++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM financial_records ${where}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const result = await pool.query(
    `SELECT id, amount, type, category, date, notes, created_by, created_at, updated_at
     FROM financial_records ${where}
     ORDER BY date DESC, created_at DESC
     LIMIT $${i} OFFSET $${i + 1}`,
    [...values, limit, offset]
  );

  return {
    data: result.rows,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    },
  };
}

async function getRecordById(id) {
  const result = await pool.query(
    'SELECT id, amount, type, category, date, notes, created_by, created_at, updated_at FROM financial_records WHERE id = $1 AND deleted_at IS NULL',
    [id]
  );
  return result.rows[0] || null;
}

async function createRecord({ amount, type, category, date, notes, created_by }) {
  const result = await pool.query(
    `INSERT INTO financial_records (amount, type, category, date, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [amount, type, category, date, notes, created_by]
  );
  return result.rows[0];
}

async function updateRecord(id, fields) {
  const allowed = ['amount', 'type', 'category', 'date', 'notes'];
  const updates = [];
  const values = [];
  let i = 1;

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = $${i++}`);
      values.push(fields[key]);
    }
  }
  if (!updates.length) return null;

  values.push(id);
  const result = await pool.query(
    `UPDATE financial_records SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${i} AND deleted_at IS NULL RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

async function softDeleteRecord(id) {
  const result = await pool.query(
    `UPDATE financial_records SET deleted_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
    [id]
  );
  return result.rows[0] || null;
}

// ── CSV EXPORT: returns all matching records as CSV string
async function getRecordsForExport({ type, category, dateFrom, dateTo, search } = {}) {
  const conditions = ['deleted_at IS NULL'];
  const values = [];
  let i = 1;

  if (type) { conditions.push(`type = $${i++}`); values.push(type); }
  if (category) { conditions.push(`category ILIKE $${i++}`); values.push(`%${category}%`); }
  if (dateFrom) { conditions.push(`date >= $${i++}`); values.push(dateFrom); }
  if (dateTo) { conditions.push(`date <= $${i++}`); values.push(dateTo); }
  if (search) {
    conditions.push(`(notes ILIKE $${i} OR category ILIKE $${i} OR description ILIKE $${i})`);
    values.push(`%${search}%`);
    i++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT id, amount, type, category, date, notes, created_at
     FROM financial_records ${where}
     ORDER BY date DESC`,
    values
  );

  const header = 'id,amount,type,category,date,notes,created_at';
  const rows = result.rows.map(r =>
    [
      r.id,
      r.amount,
      r.type,
      `"${(r.category || '').replace(/"/g, '""')}"`,
      r.date ? r.date.toISOString().split('T')[0] : '',
      `"${(r.notes || '').replace(/"/g, '""')}"`,
      r.created_at ? r.created_at.toISOString() : '',
    ].join(',')
  );

  return [header, ...rows].join('\n');
}

module.exports = { getRecords, getRecordById, createRecord, updateRecord, softDeleteRecord, getRecordsForExport };