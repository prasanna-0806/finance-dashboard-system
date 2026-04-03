/**
 * Role hierarchy: admin > analyst > viewer
 * requireRole('analyst') means analyst AND admin can access.
 * requireRole('admin')   means only admin can access.
 */
const ROLE_LEVELS = {
  viewer: 1,
  analyst: 2,
  admin: 3,
};

const requireRole = (minimumRole) => {
  return (req, res, next) => {
    const userLevel = ROLE_LEVELS[req.user.role];
    const requiredLevel = ROLE_LEVELS[minimumRole];

    if (!userLevel || userLevel < requiredLevel) {
      return res.status(403).json({
        error: `Access denied. Requires '${minimumRole}' role or higher.`,
      });
    }

    next();
  };
};

module.exports = { requireRole };
