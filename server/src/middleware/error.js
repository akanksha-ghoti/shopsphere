const notFound = (req, res, next) => {
res.status(404).json({
success: false,
message: `Route not found: ${req.method} ${req.originalUrl}`,
});
};

const errorHandler = (err, req, res, next) => {
const statusCode = err.statusCode || 500;

console.error('Application error:', err.message);

res.status(statusCode).json({
success: false,
message: statusCode >= 500
? 'Internal Server Error'
: err.message,
});
};

module.exports = {
notFound,
errorHandler,
};
