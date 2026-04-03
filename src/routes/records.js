const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const recordsService = require('../services/recordsService');
const { createRules, updateRules, listRules } = require('../validators/recordsValidator');
const { validate } = require('../validators/validate');

// All records routes require at least analyst role
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Records
 *   description: Financial records management
 */

/**
 * @swagger
 * /api/records:
 *   get:
 *     summary: List financial records with optional filters
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
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated records list
 */
router.get('/', requireRole('analyst'), listRules, validate, async (req, res, next) => {
  try {
    const result = await recordsService.listRecords({
      type: req.query.type,
      category: req.query.category,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

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
 *     responses:
 *       200:
 *         description: Record object
 *       404:
 *         description: Not found
 */
router.get('/:id', requireRole('analyst'), async (req, res, next) => {
  try {
    const record = await recordsService.getRecordById(req.params.id);
    res.json(record);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/records:
 *   post:
 *     summary: Create a new financial record (admin only)
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
 *               amount:   { type: number, example: 500.00 }
 *               type:     { type: string, enum: [income, expense] }
 *               category: { type: string, example: Salary }
 *               date:     { type: string, format: date, example: '2024-06-01' }
 *               notes:    { type: string, example: Monthly salary }
 *     responses:
 *       201:
 *         description: Record created
 */
router.post('/', requireRole('admin'), createRules, validate, async (req, res, next) => {
  try {
    const record = await recordsService.createRecord(req.body, req.user.id);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:   { type: number }
 *               type:     { type: string, enum: [income, expense] }
 *               category: { type: string }
 *               date:     { type: string, format: date }
 *               notes:    { type: string }
 *     responses:
 *       200:
 *         description: Updated record
 *       404:
 *         description: Not found
 */
router.patch('/:id', requireRole('admin'), updateRules, validate, async (req, res, next) => {
  try {
    const record = await recordsService.updateRecord(req.params.id, req.body);
    res.json(record);
  } catch (err) {
    next(err);
  }
});

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
 *     responses:
 *       200:
 *         description: Record deleted
 *       404:
 *         description: Not found
 */
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    await recordsService.deleteRecord(req.params.id);
    res.json({ message: 'Record deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
