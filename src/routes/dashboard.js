const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleGuard');
const dashboardService = require('../services/dashboardService');

// All dashboard routes require at least analyst role
// Viewers, analysts and admins can all see the dashboard
router.use(authenticate, requireRole('viewer'));

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Summary and analytics endpoints
 */

/**
 * @swagger
 * /api/dashboard/summary:
 *   get:
 *     summary: Total income, expenses, and net balance
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Financial summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_income:    { type: number }
 *                 total_expenses:  { type: number }
 *                 net_balance:     { type: number }
 */
router.get('/summary', async (req, res, next) => {
  try {
    const summary = await dashboardService.getSummary();
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/dashboard/categories:
 *   get:
 *     summary: Totals grouped by category and type
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Category-wise totals
 */
router.get('/categories', async (req, res, next) => {
  try {
    const data = await dashboardService.getCategoryTotals();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/dashboard/trends/monthly:
 *   get:
 *     summary: Monthly income vs expenses for the last 12 months
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Monthly trend data
 */
router.get('/trends/monthly', async (req, res, next) => {
  try {
    const data = await dashboardService.getMonthlyTrends();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/dashboard/trends/weekly:
 *   get:
 *     summary: Weekly income vs expenses for the last 12 weeks
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Weekly trend data
 */
router.get('/trends/weekly', async (req, res, next) => {
  try {
    const data = await dashboardService.getWeeklyTrends();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/dashboard/recent:
 *   get:
 *     summary: Most recent financial activity
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *     responses:
 *       200:
 *         description: Recent records
 */
router.get('/recent', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const data = await dashboardService.getRecentActivity(limit);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;