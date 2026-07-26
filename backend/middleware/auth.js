const jwt          = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User         = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    res.status(401); throw new Error('Not authorized — no token');
  }
  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      res.status(401); throw new Error('User not found or inactive');
    }
    req.user = user;
    next();
  } catch {
    res.status(401); throw new Error('Invalid or expired token');
  }
});

module.exports = { protect };
