const User = require('../models/User');
const cartService = require('../services/cart.service');
const { successResponse } = require('../utils/apiResponse');

async function getAuthenticatedUserId(req) {
  const email = req.user?.email;
  if (typeof email !== 'string' || !email.trim()) {
    const error = new Error('Verified account email is required to access the cart');
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

async function getCart(req, res, next) {
  try {
    const userId = await getAuthenticatedUserId(req);
    const cart = await cartService.getCart(userId);
    return successResponse(res, cart, 'Cart retrieved successfully');
  } catch (error) {
    return next(error);
  }
}

async function addItem(req, res, next) {
  try {
    const userId = await getAuthenticatedUserId(req);
    const { productId, variantId, quantity } = req.validatedData.body;
    const cart = await cartService.addProduct(userId, {
      productId,
      variantId,
      quantity,
    });
    return successResponse(res, cart, 'Item added to cart', 201);
  } catch (error) {
    return next(error);
  }
}

async function updateItem(req, res, next) {
  try {
    const userId = await getAuthenticatedUserId(req);
    const { quantity } = req.validatedData.body;
    const cart = await cartService.updateItemQuantity(
      userId,
      req.validatedData.params.id,
      quantity,
    );
    return successResponse(res, cart, 'Cart item updated');
  } catch (error) {
    return next(error);
  }
}

async function removeItem(req, res, next) {
  try {
    const userId = await getAuthenticatedUserId(req);
    const cart = await cartService.removeItem(userId, req.validatedData.params.id);
    return successResponse(res, cart, 'Cart item removed');
  } catch (error) {
    return next(error);
  }
}

async function clearCart(req, res, next) {
  try {
    const userId = await getAuthenticatedUserId(req);
    const cart = await cartService.clearCart(userId);
    return successResponse(res, cart, 'Cart cleared');
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  addItem,
  clearCart,
  getCart,
  removeItem,
  updateItem,
};
