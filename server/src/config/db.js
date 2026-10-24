const mongoose = require('mongoose');
const config = require('./env');

/**
 * Connects the application to MongoDB Atlas.
 */
const connectDB = async () => {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('MongoDB connected successfully.');
  } catch (error) {
    // Never print database credentials.
    console.error('MongoDB connection failed:', error.message);
    throw error;
  }
};

module.exports = connectDB;