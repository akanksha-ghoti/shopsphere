jest.mock('../src/models/Cart', () => ({
  create: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock('../src/models/Product', () => ({
  findById: jest.fn(),
}));

const Cart = require('../src/models/Cart');
const Product = require('../src/models/Product');
const cartService = require('../src/services/cart.service');

const userId = '0123456789abcdef01234567';
const productId = 'abcdef0123456789abcdef01';
const variantId = 'abcdef0123456789abcdef02';
const itemId = 'abcdef0123456789abcdef03';

function makeCart(items = []) {
  return {
    user: userId,
    items,
    save: jest.fn().mockResolvedValue(undefined),
  };
}

function makeProduct(overrides = {}) {
  return {
    _id: productId,
    price: 12.5,
    stock: 8,
    isActive: true,
    variants: [],
    ...overrides,
  };
}

describe('Cart service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a cart and adds a product without trusting client prices', async () => {
    const cart = makeCart();
    Cart.findOne.mockResolvedValue(null);
    Cart.create.mockResolvedValue(cart);
    Product.findById.mockResolvedValue(makeProduct());

    const result = await cartService.addProduct(userId, {
      productId,
      quantity: 2,
      price: 0.01,
    });

    expect(Cart.create).toHaveBeenCalledWith({ user: userId, items: [] });
    expect(cart.items).toEqual([{ product: productId, variant: null, quantity: 2 }]);
    expect(cart.save).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ subtotal: 25, itemCount: 2 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      product: { _id: productId },
      quantity: 2,
      unitPrice: 12.5,
      lineTotal: 25,
    });
  });

  it('merges a duplicate product/variant combination into one cart item', async () => {
    const cart = makeCart([{ _id: itemId, product: productId, variant: null, quantity: 1 }]);
    Cart.findOne.mockResolvedValue(cart);
    Product.findById.mockResolvedValue(makeProduct());

    await cartService.addProduct(userId, { productId, quantity: 2 });

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(3);
  });

  it('updates item quantity after checking current stock', async () => {
    const cart = makeCart([{ _id: itemId, product: productId, variant: null, quantity: 1 }]);
    Cart.findOne.mockResolvedValue(cart);
    Product.findById.mockResolvedValue(makeProduct());

    const result = await cartService.updateItemQuantity(userId, itemId, 4);

    expect(cart.items[0].quantity).toBe(4);
    expect(result).toMatchObject({ subtotal: 50, itemCount: 4 });
    expect(cart.save).toHaveBeenCalledTimes(1);
  });

  it('removes a cart item and recalculates totals', async () => {
    const cart = makeCart([{ _id: itemId, product: productId, variant: null, quantity: 3 }]);
    Cart.findOne.mockResolvedValue(cart);

    const result = await cartService.removeItem(userId, itemId);

    expect(cart.items).toHaveLength(0);
    expect(result).toMatchObject({ subtotal: 0, itemCount: 0 });
  });

  it('clears all items from the authenticated user cart', async () => {
    const cart = makeCart([{ product: productId, variant: null, quantity: 2 }]);
    Cart.findOne.mockResolvedValue(cart);

    const result = await cartService.clearCart(userId);

    expect(cart.items).toEqual([]);
    expect(cart.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ cart, items: [], subtotal: 0, itemCount: 0 });
  });

  it('rejects quantities exceeding stock or the configured maximum', async () => {
    Cart.findOne.mockResolvedValue(null);
    Product.findById.mockResolvedValue(makeProduct({ stock: 2 }));

    await expect(cartService.addProduct(userId, { productId, quantity: 3 })).rejects.toMatchObject({
      statusCode: 409,
      code: 'INSUFFICIENT_STOCK',
    });
    expect(Cart.create).not.toHaveBeenCalled();

    await expect(
      cartService.addProduct(userId, { productId, quantity: 100 }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_QUANTITY' });
  });

  it('rejects missing products and unavailable inventory', async () => {
    Product.findById.mockResolvedValueOnce(null);
    await expect(cartService.addProduct(userId, { productId, quantity: 1 })).rejects.toMatchObject({
      statusCode: 404,
      code: 'PRODUCT_NOT_FOUND',
    });

    Product.findById.mockResolvedValueOnce(makeProduct({ isActive: false }));
    await expect(cartService.addProduct(userId, { productId, quantity: 1 })).rejects.toMatchObject({
      statusCode: 409,
      code: 'PRODUCT_UNAVAILABLE',
    });
  });

  it('uses the latest database price when calculating an existing cart', async () => {
    const cart = makeCart([{ product: productId, variant: null, quantity: 2 }]);
    Cart.findOne.mockResolvedValue(cart);
    Product.findById.mockResolvedValue(makeProduct({ price: 19.99 }));

    const result = await cartService.getCart(userId);

    expect(result).toMatchObject({ subtotal: 39.98, itemCount: 2 });
  });

  it('rejects totals when current stock has fallen below the cart quantity', async () => {
    const cart = makeCart([{ product: productId, variant: null, quantity: 3 }]);
    Cart.findOne.mockResolvedValue(cart);
    Product.findById.mockResolvedValue(makeProduct({ stock: 2 }));

    await expect(cartService.getCart(userId)).rejects.toMatchObject({
      statusCode: 409,
      code: 'INSUFFICIENT_STOCK',
    });
  });

  it('uses variant override pricing and independently validates variant stock', async () => {
    const cart = makeCart();
    const product = makeProduct({
      variants: [{ _id: variantId, price: 20, stock: 2 }],
    });
    Cart.findOne.mockResolvedValue(null);
    Cart.create.mockResolvedValue(cart);
    Product.findById.mockResolvedValue(product);

    const result = await cartService.addProduct(userId, {
      productId,
      variantId,
      quantity: 2,
    });

    expect(result).toMatchObject({ subtotal: 40, itemCount: 2 });
    await expect(
      cartService.addProduct(userId, { productId, variantId, quantity: 1 }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'INSUFFICIENT_STOCK' });
  });

  it('falls back to parent product price for variants without overrides', async () => {
    const cart = makeCart([{ product: productId, variant: variantId, quantity: 2 }]);
    Cart.findOne.mockResolvedValue(cart);
    Product.findById.mockResolvedValue(makeProduct({ variants: [{ _id: variantId, stock: 3 }] }));

    const result = await cartService.getCart(userId);

    expect(result).toMatchObject({ subtotal: 25, itemCount: 2 });
  });

  it('requires valid variant selection and handles deleted products safely', async () => {
    Product.findById.mockResolvedValue(makeProduct({ variants: [{ _id: variantId, stock: 1 }] }));
    await expect(cartService.addProduct(userId, { productId, quantity: 1 })).rejects.toMatchObject({
      statusCode: 400,
      code: 'VARIANT_REQUIRED',
    });

    const cart = makeCart([{ product: productId, variant: null, quantity: 1 }]);
    Cart.findOne.mockResolvedValue(cart);
    Product.findById.mockResolvedValue(null);
    await expect(cartService.getCart(userId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'PRODUCT_NOT_FOUND',
    });
  });

  it('returns an empty cart result and rejects invalid IDs', async () => {
    Cart.findOne.mockResolvedValue(null);
    await expect(cartService.getCart(userId)).resolves.toEqual({
      cart: null,
      items: [],
      subtotal: 0,
      itemCount: 0,
    });
    await expect(
      cartService.addProduct(userId, { productId: 'bad-id', quantity: 1 }),
    ).rejects.toMatchObject({ statusCode: 400, code: 'INVALID_ID' });
  });

  it('handles a concurrent first-cart creation through the unique user index', async () => {
    const cart = makeCart();
    const duplicateKey = Object.assign(new Error('duplicate user cart'), {
      code: 11000,
    });
    Cart.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(cart);
    Cart.create.mockRejectedValue(duplicateKey);
    Product.findById.mockResolvedValue(makeProduct());

    await expect(cartService.addProduct(userId, { productId, quantity: 1 })).resolves.toMatchObject(
      { subtotal: 12.5, itemCount: 1 },
    );
    expect(Cart.findOne).toHaveBeenCalledTimes(2);
  });
});
