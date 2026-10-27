const express = require('express');
const userRoutes = require('./routes/user.routes');
const healthRoutes = require('./routes/health.routes');
const pingRoutes = require('./routes/ping.routes');
const validationRoutes = require('./routes/validation.routes');

const logger = require('./middleware/logger');
const corsMiddleware = require('./config/cors');

const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.use(corsMiddleware);
app.use(express.json());
app.use(logger);
app.use('/api/users', userRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/ping', pingRoutes);
app.use('/api/validation', validationRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
