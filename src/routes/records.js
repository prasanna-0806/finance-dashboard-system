// routes/records.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const { body, query, param, validationResult } = require('express-validator');
const {
  getRecords,
  getRecordById,
  createRecord,
  updateRecord,
  softDeleteRecord,
  getRecordsForExport,
} = require('../services/recordsService');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
};


/**
 * @swagger
 * /api/records/export:
 *   get:
 *     summary: Export financial records as CSV
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [income, expense] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: CSV file download
 */
router.get(
  '/export',
  authenticate,
  requireRole('analyst'),
  async (req, res) => {
    try {
      const csv = await getRecordsForExport(req.query);
      const filename = `records-${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to export records' });
    }
  }
);

/**
 * @swagger
 * /api/records:
 *   get:
 *     summary: List financial records
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [income, expense] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of records
 */
router.get(
  '/',
  authenticate,
 requireRole('analyst'),
  [
    query('type').optional().isIn(['income', 'expense']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('search').optional().isString().trim().isLength({ max: 200 }),
    handleValidation,
  ],
  async (req, res) => {
    try {
      const result = await getRecords(req.query);
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch records' });
    }
  }
);

/**
 * @swagger
 * /api/records/{id}:
 *   get:
 *     summary: Get a single record by ID
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Record UUID
 *     responses:
 *       200:
 *         description: Record object
 *       404:
 *         description: Record not found
 */
router.get(
  '/:id',
  authenticate,
  requireRole('analyst'),
  // FIX: was isInt() — UUIDs are not integers, causing all single-record fetches to 422
  [param('id').isUUID(), handleValidation],
  async (req, res) => {
    try {
      const record = await getRecordById(req.params.id);
      if (!record) return res.status(404).json({ error: 'Record not found' });
      res.json(record);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch record' });
    }
  }
);
/**
 * @swagger
 * /api/records:
 *   post:
 *     summary: Create a financial record (admin only)
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type, category, date]
 *             properties:
 *               amount: { type: number, example: 5000 }
 *               type: { type: string, enum: [income, expense] }
 *               category: { type: string, example: Salary }
 *               date: { type: string, format: date, example: "2026-04-01" }
 *               notes: { type: string, example: Monthly salary }
 *     responses:
 *       201:
 *         description: Created record
 */
router.post(
  '/',
  authenticate,
 requireRole('admin'),
  [
    body('amount').isFloat({ min: 0.01 }),
    body('type').isIn(['income', 'expense']),
    body('category').isString().trim().notEmpty(),
    body('date').isISO8601(),
    body('notes').optional().isString().trim(),
    body('description').optional().isString().trim(),
    handleValidation,
  ],
  async (req, res) => {
    try {
      const record = await createRecord({ ...req.body, created_by: req.user.id });
      res.status(201).json(record);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create record' });
    }
  }
);

/**
 * @swagger
 * /api/records/{id}:
 *   patch:
 *     summary: Update a financial record (admin only)
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount: { type: number }
 *               type: { type: string, enum: [income, expense] }
 *               category: { type: string }
 *               date: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Updated record
 */
router.patch(
  '/:id',
  authenticate,
  requireRole('admin'),
  [
    // FIX: was isInt() — replaced with isUUID()
    param('id').isUUID(),
    body('amount').optional().isFloat({ min: 0.01 }),
    body('type').optional().isIn(['income', 'expense']),
    body('category').optional().isString().trim().notEmpty(),
    body('date').optional().isISO8601(),
    handleValidation,
  ],
  async (req, res) => {
    try {
      const record = await updateRecord(req.params.id, req.body);
      if (!record) return res.status(404).json({ error: 'Record not found' });
      res.json(record);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update record' });
    }
  }
);
/**
 * @swagger
 * /api/records/{id}:
 *   delete:
 *     summary: Soft-delete a financial record (admin only)
 *     tags: [Records]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Record UUID
 *     responses:
 *       200:
 *         description: Record deleted
 *       404:
 *         description: Record not found
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('admin'),
  // FIX: was isInt() — replaced with isUUID()
  [param('id').isUUID(), handleValidation],
  async (req, res) => {
    try {
      const result = await softDeleteRecord(req.params.id);
      if (!result) return res.status(404).json({ error: 'Record not found' });
      res.json({ message: 'Record deleted', id: result.id });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete record' });
    }
  }
);

module.exports = router;