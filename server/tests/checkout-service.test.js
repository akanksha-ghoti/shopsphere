jest.mock('../src/models/Address', () => ({
  findOne: jest.fn(),
}));

jest.mock('../src/models/Cart', () => ({
  findOne: jest.fn(),
}));

jest.mock('../src/models/Product', () => ({
  findById: jest.fn(),
}));

const Address = require('../src/models/Address');
const Cart = require('../src/models/Cart');
const Product = require('../src/models/Product');
const checkoutService = require('../src/services/checkout.service');

const userId = '0123456789abcdef01234567';
const addressId = 'abcdef0123456789abcdef01';
const productId = 'abcdef0123456789abcdef02';
const variantId = 'abcdef0123456789abcdef03';
const address = { _id: addressId, user: userId, city: 'Pune' };

function makeCart(items) {
  return { user: userId, items };
}

function makeProduct(overrides = {}) {
  return {
    _id: productId,
    name: 'Test Product',
    slug: 'test-product',
    images: ['product.png'],
    price: 100,
    stock: 10,
    isActive: true,
    variants: [],
    ...overrides,
  };
}

describe('Checkout summary service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Address.findOne.mockResolvedValue(address);
    Cart.findOne.mockResolvedValue(
      makeCart([{ _id: 'cart-item-1', product: productId, variant: null, quantity: 2 }]),
    );
    Product.findById.mockResolvedValue(makeProduct());
  });

  it('uses valid environment overrides for shipping and tax pricing rules', () => {
    const previousValues = {
      shippingFee: process.env.CHECKOUT_SHIPPING_FEE_INR,
      threshold: process.env.CHECKOUT_FREE_SHIPPING_THRESHOLD_INR,
      taxRate: process.env.CHECKOUT_TAX_RATE,
    };

    process.env.CHECKOUT_SHIPPING_FEE_INR = '49';
    process.env.CHECKOUT_FREE_SHIPPING_THRESHOLD_INR = '750';
    process.env.CHECKOUT_TAX_RATE = '0.05';

    try {
      let configuredService;
      jest.isolateModules(() => {
        configuredService = require('../src/services/checkout.service');
      });

      expect(configuredService.SHIPPING_FEE).toBe(49);
      expect(configuredService.FREE_SHIPPING_THRESHOLD).toBe(750);
      expect(configuredService.TAX_RATE).toBe(0.05);
    } finally {
      for (const [key, value] of Object.entries({
        CHECKOUT_SHIPPING_FEE_INR: previousValues.shippingFee,
        CHECKOUT_FREE_SHIPPING_THRESHOLD_INR: previousValues.threshold,
        CHECKOUT_TAX_RATE: previousValues.taxRate,
      })) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });

  it('calculates current server-side line prices, shipping, tax, and grand total', async () => {
    Product.findById.mockResolvedValue(makeProduct({ price: 149.99 }));

    const result = await checkoutService.createSummary(userId, addressId);

    expect(Address.findOne).toHaveBeenCalledWith({ _id: addressId, user: userId });
    expect(Cart.findOne).toHaveBeenCalledWith({ user: userId });
    expect(Product.findById).toHaveBeenCalledWith(productId);
    expect(result).toMatchObject({
      address: {
        _id: addressId,
        name: address.name,
        phone: address.phone,
        street: address.street,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
      },
      subtotal: 299.98,
      shippingFee: 99,
      shipping: {
        fee: 99,
        freeShippingThreshold: 1000,
        isFree: false,
      },
      tax: { rate: 0.18, amount: 54 },
      grandTotal: 452.98,
      currency: 'INR',
      items: [
        {
          product: { _id: productId, name: 'Test Product' },
          quantity: 2,
          unitPrice: 149.99,
          lineTotal: 299.98,
        },
      ],
    });
    expect(result.address).not.toHaveProperty('user');
  });

  it('uses the current variant override price and variant stock', async () => {
    const variant = {
      _id: variantId,
      size: 'M',
      color: 'Blue',
      sku: 'SHIRT-BLU-M',
      price: 250,
      stock: 3,
    };
    Cart.findOne.mockResolvedValue(
      makeCart([
        {
          _id: 'cart-item-variant',
          product: productId,
          variant: variantId,
          quantity: 2,
        },
      ]),
    );
    Product.findById.mockResolvedValue(makeProduct({ variants: [variant] }));

    const result = await checkoutService.createSummary(userId, addressId);

    expect(result.items[0]).toMatchObject({
      variant: { _id: variantId, size: 'M', color: 'Blue' },
      unitPrice: 250,
      lineTotal: 500,
    });
    expect(result.subtotal).toBe(500);
  });

  it('waives shipping at the configured threshold', async () => {
    Cart.findOne.mockResolvedValue(
      makeCart([{ _id: 'cart-item-1', product: productId, variant: null, quantity: 10 }]),
    );
    Product.findById.mockResolvedValue(makeProduct({ price: 100 }));

    const result = await checkoutService.createSummary(userId, addressId);

    expect(result.subtotal).toBe(1000);
    expect(result.shippingFee).toBe(0);
    expect(result.shipping.isFree).toBe(true);
    expect(result.grandTotal).toBe(1180);
  });

  it('rejects invalid address IDs and addresses not owned by the user', async () => {
    await expect(checkoutService.createSummary(userId, 'not-an-object-id')).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_ADDRESS_ID',
    });

    Address.findOne.mockResolvedValueOnce(null);
    await expect(checkoutService.createSummary(userId, addressId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'ADDRESS_NOT_FOUND',
    });
    expect(Cart.findOne).not.toHaveBeenCalled();
  });

  it('rejects an empty or missing cart', async () => {
    Cart.findOne.mockResolvedValueOnce(null);
    await expect(checkoutService.createSummary(userId, addressId)).rejects.toMatchObject({
      statusCode: 400,
      code: 'CART_EMPTY',
    });

    Cart.findOne.mockResolvedValueOnce(makeCart([]));
    await expect(checkoutService.createSummary(userId, addressId)).rejects.toMatchObject({
      statusCode: 400,
      code: 'CART_EMPTY',
    });
  });

  it('rejects insufficient stock using current product stock', async () => {
    Product.findById.mockResolvedValue(makeProduct({ stock: 1 }));

    await expect(checkoutService.createSummary(userId, addressId)).rejects.toMatchObject({
      statusCode: 409,
      code: 'INSUFFICIENT_STOCK',
    });
  });

  it('rejects products removed, inactive, or missing their selected variant', async () => {
    Product.findById.mockResolvedValueOnce(null);
    await expect(checkoutService.createSummary(userId, addressId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'PRODUCT_NOT_FOUND',
    });

    Product.findById.mockResolvedValueOnce(makeProduct({ isActive: false }));
    await expect(checkoutService.createSummary(userId, addressId)).rejects.toMatchObject({
      statusCode: 409,
      code: 'PRODUCT_UNAVAILABLE',
    });

    Cart.findOne.mockResolvedValue(
      makeCart([
        {
          _id: 'cart-item-variant',
          product: productId,
          variant: variantId,
          quantity: 1,
        },
      ]),
    );
    Product.findById.mockResolvedValue(
      makeProduct({
        variants: [
          {
            _id: 'abcdef0123456789abcdef04',
            size: 'L',
            color: 'Black',
            sku: 'SHIRT-BLK-L',
            stock: 5,
          },
        ],
      }),
    );
    await expect(checkoutService.createSummary(userId, addressId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'VARIANT_NOT_FOUND',
    });
  });
});
