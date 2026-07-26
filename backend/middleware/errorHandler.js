const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Not found — ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  const code = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(code).json({
    success: false,
    message: err.message || 'Server error',
    stack:   process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

module.exports = { notFound, errorHandler };
