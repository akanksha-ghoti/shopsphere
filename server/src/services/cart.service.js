const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

const MAX_ITEM_QUANTITY = 99;

function createCartError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function assertObjectId(value, label) {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(value)) {
    throw createCartError(400, 'INVALID_ID', `${label} must be a valid MongoDB ObjectId`);
  }
}

function assertQuantity(quantity) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
    throw createCartError(
      400,
      'INVALID_QUANTITY',
      `Quantity must be an integer between 1 and ${MAX_ITEM_QUANTITY}`,
    );
  }
}

function findVariant(product, variantId) {
  return (product.variants || []).find((variant) => String(variant._id) === String(variantId));
}

async function getProduct(productId) {
  const product = await Product.findById(productId);

  if (!product) {
    throw createCartError(404, 'PRODUCT_NOT_FOUND', 'Product was not found');
  }
  if (product.isActive === false) {
    throw createCartError(409, 'PRODUCT_UNAVAILABLE', 'This product is no longer available');
  }

  return product;
}

function getItemAvailability(product, variantId) {
  if (product.variants?.length) {
    if (!variantId) {
      throw createCartError(
        400,
        'VARIANT_REQUIRED',
        'Select a product variant before adding it to the cart',
      );
    }

    const variant = findVariant(product, variantId);
    if (!variant) {
      throw createCartError(404, 'VARIANT_NOT_FOUND', 'Product variant was not found');
    }

    return {
      variant,
      stock: variant.stock,
      price: variant.price ?? product.price,
    };
  }

  if (variantId) {
    throw createCartError(
      400,
      'VARIANT_NOT_APPLICABLE',
      'This product does not have selectable variants',
    );
  }

  return { variant: null, stock: product.stock, price: product.price };
}

async function findOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (cart) {
    return cart;
  }

  try {
    return await Cart.create({ user: userId, items: [] });
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }

    cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw error;
    }

    return cart;
  }
}

async function calculateCartTotals(cart) {
  let subtotal = 0;
  let itemCount = 0;
  const items = [];

  for (const item of cart.items) {
    const productId = String(item.product?._id || item.product);
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw createCartError(
        409,
        'PRODUCT_UNAVAILABLE',
        'A product in this cart is no longer available',
      );
    }

    const product = await getProduct(productId);
    const { price, stock, variant } = getItemAvailability(product, item.variant);
    assertQuantity(item.quantity);
    if (item.quantity > stock) {
      throw createCartError(
        409,
        'INSUFFICIENT_STOCK',
        'A cart item exceeds the currently available stock',
      );
    }

    itemCount += item.quantity;
    const unitPrice = Math.round((price + Number.EPSILON) * 100) / 100;
    subtotal += unitPrice * item.quantity;
    items.push({
      _id: item._id,
      product: {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        images: product.images,
      },
      variant: variant
        ? {
            _id: variant._id,
            size: variant.size,
            color: variant.color,
            sku: variant.sku,
          }
        : null,
      quantity: item.quantity,
      unitPrice,
      lineTotal: Math.round((unitPrice * item.quantity + Number.EPSILON) * 100) / 100,
    });
  }

  return {
    items,
    subtotal: Math.round((subtotal + Number.EPSILON) * 100) / 100,
    itemCount,
  };
}

async function getCart(userId) {
  assertObjectId(userId, 'User ID');
  const cart = await Cart.findOne({ user: userId });

  if (!cart) {
    return { cart: null, items: [], subtotal: 0, itemCount: 0 };
  }

  return { cart, ...(await calculateCartTotals(cart)) };
}

async function addProduct(userId, { productId, variantId, quantity }) {
  assertObjectId(userId, 'User ID');
  assertObjectId(productId, 'Product ID');
  if (variantId !== undefined && variantId !== null) {
    assertObjectId(variantId, 'Variant ID');
  }
  userId = userId.toLowerCase();
  productId = productId.toLowerCase();
  variantId = variantId?.toLowerCase();
  assertQuantity(quantity);

  const product = await getProduct(productId);
  const selected = getItemAvailability(product, variantId);
  if (quantity > selected.stock) {
    throw createCartError(409, 'INSUFFICIENT_STOCK', 'Requested quantity exceeds available stock');
  }

  const cart = await findOrCreateCart(userId);
  const existingItem = cart.items.find(
    (item) =>
      String(item.product?._id || item.product) === productId &&
      String(item.variant || '') === String(variantId || ''),
  );
  const nextQuantity = (existingItem?.quantity || 0) + quantity;

  if (nextQuantity > MAX_ITEM_QUANTITY) {
    throw createCartError(
      400,
      'QUANTITY_LIMIT_EXCEEDED',
      `A cart item cannot exceed ${MAX_ITEM_QUANTITY}`,
    );
  }
  if (nextQuantity > selected.stock) {
    throw createCartError(409, 'INSUFFICIENT_STOCK', 'Requested quantity exceeds available stock');
  }

  if (existingItem) {
    existingItem.quantity = nextQuantity;
  } else {
    cart.items.push({
      product: productId,
      variant: variantId || null,
      quantity,
    });
  }

  await cart.save();
  return { cart, ...(await calculateCartTotals(cart)) };
}

async function updateItemQuantity(userId, itemId, quantity) {
  assertObjectId(userId, 'User ID');
  assertObjectId(itemId, 'Cart item ID');
  assertQuantity(quantity);

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw createCartError(404, 'CART_NOT_FOUND', 'Cart was not found');
  }

  const item = cart.items.id
    ? cart.items.id(itemId)
    : cart.items.find((candidate) => String(candidate._id) === itemId);
  if (!item) {
    throw createCartError(404, 'CART_ITEM_NOT_FOUND', 'Cart item was not found');
  }

  const product = await getProduct(String(item.product?._id || item.product));
  const { stock } = getItemAvailability(product, item.variant);
  if (quantity > stock) {
    throw createCartError(409, 'INSUFFICIENT_STOCK', 'Requested quantity exceeds available stock');
  }

  item.quantity = quantity;
  await cart.save();
  return { cart, ...(await calculateCartTotals(cart)) };
}

async function removeItem(userId, itemId) {
  assertObjectId(userId, 'User ID');
  assertObjectId(itemId, 'Cart item ID');

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw createCartError(404, 'CART_NOT_FOUND', 'Cart was not found');
  }

  const item = cart.items.id
    ? cart.items.id(itemId)
    : cart.items.find((candidate) => String(candidate._id) === itemId);
  if (!item) {
    throw createCartError(404, 'CART_ITEM_NOT_FOUND', 'Cart item was not found');
  }

  if (cart.items.id) {
    item.deleteOne();
  } else {
    cart.items = cart.items.filter((candidate) => String(candidate._id) !== itemId);
  }

  await cart.save();
  return { cart, ...(await calculateCartTotals(cart)) };
}

async function clearCart(userId) {
  assertObjectId(userId, 'User ID');

  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    return { cart: null, items: [], subtotal: 0, itemCount: 0 };
  }

  cart.items = [];
  await cart.save();
  return { cart, items: [], subtotal: 0, itemCount: 0 };
}

module.exports = {
  MAX_ITEM_QUANTITY,
  addProduct,
  calculateCartTotals,
  clearCart,
  getCart,
  removeItem,
  updateItemQuantity,
};
