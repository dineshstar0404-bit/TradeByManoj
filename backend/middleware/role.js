const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403);
    throw new Error(`Access denied — requires: ${roles.join(' or ')}`);
  }
  next();
};

module.exports = { requireRole };
