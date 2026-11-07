const Wishlist = require('../models/Wishlist');
const cartService = require('./cart.service');

function createWishlistError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function moveProductToCart(userId, productId) {
  const wishlistItem = await Wishlist.findOne({
    user: userId,
    product: productId,
  });

  if (!wishlistItem) {
    throw createWishlistError(404, 'Wishlist item not found');
  }

  const cart = await cartService.addProduct(userId, {
    productId,
    quantity: 1,
  });

  await Wishlist.findOneAndDelete({
    _id: wishlistItem._id,
    user: userId,
    product: productId,
  });

  return { productId, cart };
}

module.exports = { moveProductToCart };
