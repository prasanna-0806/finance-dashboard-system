const { validationResult } = require('express-validator');

/**
 * Reads express-validator results and sends a 422 if there are errors.
 * Call this at the top of any route handler that uses validation rules.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

module.exports = { validate };
