const express = require('express');

const userRoutes = require('./routes/user.routes');
const healthRoutes = require('./routes/health.routes');
const pingRoutes = require('./routes/ping.routes');
const validationRoutes = require('./routes/validation.routes');
const categoryRoutes = require('./routes/category.routes');
const productRoutes = require('./routes/product.routes');

const logger = require('./middleware/logger');
const corsMiddleware = require('./config/cors');

const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.use(corsMiddleware);
app.use(express.json());
app.use(logger);

// API routes
app.use('/api/users', userRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/ping', pingRoutes);
app.use('/api/validation', validationRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
