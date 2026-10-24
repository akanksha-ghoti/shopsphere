const app = require('./app');
const connectDB = require('./config/db');
const config = require('./config/env');

const startServer = async () => {
  try {
    // Connect to MongoDB before starting the server.
    await connectDB();

    app.listen(config.port, () => {
      console.log(
        `ShopSphere server running on port ${config.port} (${config.nodeEnv})`
      );
    });
  } catch (error) {
    console.error('Application startup failed:', error.message);
    process.exit(1);
  }
};

startServer();