const mongoose = require('mongoose');
const Address = require('../models/Address');
const cartService = require('./cart.service');

function readPricingSetting(name, defaultValue, isValid) {
  const rawValue = process.env[name];
  if (rawValue === undefined) {
    return defaultValue;
  }

  const value = Number(rawValue);
  if (!Number.isFinite(value) || !isValid(value)) {
    throw new Error(`Invalid ${name} configuration`);
  }

  return value;
}

const SHIPPING_FEE = readPricingSetting('CHECKOUT_SHIPPING_FEE_INR', 99, (value) => value >= 0);
const FREE_SHIPPING_THRESHOLD = readPricingSetting(
  'CHECKOUT_FREE_SHIPPING_THRESHOLD_INR',
  1000,
  (value) => value >= 0,
);
const TAX_RATE = readPricingSetting('CHECKOUT_TAX_RATE', 0.18, (value) => value >= 0 && value <= 1);

function createCheckoutError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function roundCurrency(amount) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

async function createSummary(userId, addressId) {
  if (!mongoose.isValidObjectId(userId)) {
    throw createCheckoutError(400, 'INVALID_USER_ID', 'Invalid authenticated user');
  }
  if (!mongoose.isValidObjectId(addressId)) {
    throw createCheckoutError(
      400,
      'INVALID_ADDRESS_ID',
      'Address ID must be a valid MongoDB ObjectId',
    );
  }

  const address = await Address.findOne({ _id: addressId, user: userId });
  if (!address) {
    throw createCheckoutError(404, 'ADDRESS_NOT_FOUND', 'Address was not found');
  }

  const cart = await cartService.getCart(String(userId));
  if (!cart?.items?.length) {
    throw createCheckoutError(400, 'CART_EMPTY', 'Add items to your cart before checkout');
  }

  const subtotal = roundCurrency(cart.subtotal);
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const tax = roundCurrency(subtotal * TAX_RATE);
  const grandTotal = roundCurrency(subtotal + shippingFee + tax);

  return {
    address: {
      _id: address._id,
      name: address.name,
      phone: address.phone,
      street: address.street,
      addressLine2: address.addressLine2,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
    },
    items: cart.items,
    subtotal,
    shippingFee,
    shipping: {
      fee: shippingFee,
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      isFree: shippingFee === 0,
    },
    tax: {
      rate: TAX_RATE,
      amount: tax,
    },
    grandTotal,
    currency: 'INR',
  };
}

module.exports = {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
  TAX_RATE,
  createSummary,
};
