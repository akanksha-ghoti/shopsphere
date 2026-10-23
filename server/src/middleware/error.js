// Handles requests to routes that do not exist.
const notFound = (req, res, next) => {
  res.status(404).json({
    status: 'ERROR',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

// Centralized error handler for application errors.
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;

  console.error('Application error:', err.message);

  res.status(statusCode).json({
    status: 'ERROR',
    message: statusCode >= 500 ? 'Internal Server Error' : err.message,
  });
};

module.exports = {
  notFound,
  errorHandler,
};