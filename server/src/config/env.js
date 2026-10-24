const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../../.env'),
});

const nodeEnv = process.env.NODE_ENV || 'development';
const port = Number(process.env.PORT || 5000);
const mongodbUri = process.env.MONGODB_URI;

if (!mongodbUri) {
  throw new Error('MONGODB_URI is required in the server/.env file.');
}

if (!['development', 'production', 'test'].includes(nodeEnv)) {
  throw new Error('NODE_ENV must be development, production, or test.');
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid number between 1 and 65535.');
}

module.exports = {
  nodeEnv,
  port,
  mongodbUri,
  isDevelopment: nodeEnv === 'development',
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
};