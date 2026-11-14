const User = require('../models/User');
const checkoutService = require('../services/checkout.service');
const { successResponse } = require('../utils/apiResponse');

async function getAuthenticatedUserId(req) {
  const email = req.user?.email;
  if (typeof email !== 'string' || !email.trim()) {
    const error = new Error('Verified account email is required for checkout');
    error.statusCode = 401;
    throw error;
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    const error = new Error('User profile not found. Sync your profile first.');
    error.statusCode = 404;
    throw error;
  }

  return user._id;
}

async function createCheckoutSummary(req, res, next) {
  try {
    const userId = await getAuthenticatedUserId(req);
    const summary = await checkoutService.createSummary(userId, req.validatedData.body.addressId);
    return successResponse(res, summary, 'Checkout summary created successfully');
  } catch (error) {
    return next(error);
  }
}

module.exports = { createCheckoutSummary };
