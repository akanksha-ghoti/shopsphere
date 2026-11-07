const mongoose = require('mongoose');
const Product = require('../models/Product');
const User = require('../models/User');
const Wishlist = require('../models/Wishlist');
const wishlistService = require('../services/wishlist.service');
const { successResponse } = require('../utils/apiResponse');

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function assertProductId(productId) {
  if (
    typeof productId !== 'string' ||
    !/^[a-f\d]{24}$/i.test(productId) ||
    !mongoose.isValidObjectId(productId)
  ) {
    throw createError(400, 'Invalid product ID');
  }
}

async function getAuthenticatedUserId(req) {
  const email = req.user?.email;
  if (typeof email !== 'string' || !email.trim()) {
    throw createError(401, 'Verified account email is required to access the wishlist');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw createError(404, 'User profile not found. Sync your profile first.');
  }

  return user._id;
}

async function getWishlist(req, res, next) {
  try {
    const userId = await getAuthenticatedUserId(req);
    const wishlist = await Wishlist.find({ user: userId })
      .populate('product', 'name slug price images')
      .sort({ createdAt: -1, _id: -1 });

    return successResponse(res, wishlist, 'Wishlist retrieved successfully');
  } catch (error) {
    return next(error);
  }
}

async function addToWishlist(req, res, next) {
  try {
    const userId = await getAuthenticatedUserId(req);
    const { productId } = req.validatedData.body;
    assertProductId(productId);

    const product = await Product.findById(productId);
    if (!product) {
      throw createError(404, 'Product not found');
    }

    let wishlist = await Wishlist.findOne({ user: userId, product: productId });
    if (wishlist) {
      return successResponse(res, wishlist, 'Product is already in your wishlist');
    }

    try {
      wishlist = await Wishlist.create({ user: userId, product: productId });
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }

      wishlist = await Wishlist.findOne({ user: userId, product: productId });
      if (!wishlist) {
        throw error;
      }

      return successResponse(res, wishlist, 'Product is already in your wishlist');
    }

    return successResponse(res, wishlist, 'Product added to wishlist', 201);
  } catch (error) {
    return next(error);
  }
}

async function removeFromWishlist(req, res, next) {
  try {
    const userId = await getAuthenticatedUserId(req);
    const { productId } = req.validatedData.params;
    assertProductId(productId);

    const wishlist = await Wishlist.findOneAndDelete({
      user: userId,
      product: productId,
    });

    if (!wishlist) {
      throw createError(404, 'Wishlist item not found');
    }

    return successResponse(res, null, 'Product removed from wishlist');
  } catch (error) {
    return next(error);
  }
}

async function moveToCart(req, res, next) {
  try {
    const userId = await getAuthenticatedUserId(req);
    const { productId } = req.validatedData.params;
    assertProductId(productId);

    const result = await wishlistService.moveProductToCart(userId, productId);
    return successResponse(res, result, 'Product moved to cart');
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  addToWishlist,
  getWishlist,
  moveToCart,
  removeFromWishlist,
};
