const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/health.routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

// Middleware: allow cross-origin requests and parse JSON bodies.
app.use(cors());
app.use(express.json());

// Log incoming HTTP requests.
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// API routes.
app.use('/api/health', healthRoutes);

// Handle unknown routes and application errors.
app.use(notFound);
app.use(errorHandler);

module.exports = app;