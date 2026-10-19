const mongoose = require('mongoose');

/**
 * Connects the application to MongoDB Atlas.
 */
const connectDB = async () => {
  // Stop startup if the MongoDB connection string is missing.
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing from the environment variables.');
  }

  try {
    // Connect to MongoDB Atlas using the environment variable.
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('MongoDB connected successfully.');
  } catch (error) {
    // Never print the connection string or database credentials.
    console.error('MongoDB connection failed:', error.message);
    throw error;
  }
};

module.exports = connectDB;