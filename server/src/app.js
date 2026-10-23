const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/health.routes');
const pingRoutes = require('./routes/ping.routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// API routes
app.use('/api/health', healthRoutes);
app.use('/api/ping', pingRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;