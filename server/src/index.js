const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Health-check endpoint.
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'ShopSphere API',
  });
});

// Start the server only after MongoDB connects successfully.
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`ShopSphere server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Application startup failed:', error.message);
    process.exit(1);
  }
};

startServer();