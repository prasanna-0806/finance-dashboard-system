const router = require('express').Router();
const authService = require('../services/authService');
const { registerRules, loginRules } = require('../validators/authValidator');
const { validate } = require('../validators/validate');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Register and login
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:     { type: string, example: Alice }
 *               email:    { type: string, example: alice@example.com }
 *               password: { type: string, example: secret123 }
 *               role:     { type: string, enum: [admin, analyst, viewer], default: viewer }
 *     responses:
 *       201:
 *         description: User created
 *       409:
 *         description: Email already in use
 *       422:
 *         description: Validation errors
 */
router.post('/register', registerRules, validate, async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ message: 'User registered successfully', user });
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login and receive a JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, example: alice@example.com }
 *               password: { type: string, example: secret123 }
 *     responses:
 *       200:
 *         description: Returns JWT token and user info
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', loginRules, validate, async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
