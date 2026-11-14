const mongoose = require('mongoose');
const CheckoutSession = require('../src/models/CheckoutSession');

describe('CheckoutSession model', () => {
  it('accepts a complete server-side checkout snapshot', async () => {
    const objectId = () => new mongoose.Types.ObjectId();
    const addressId = objectId();
    const session = new CheckoutSession({
      user: objectId(),
      address: addressId,
      expiresAt: new Date(Date.now() + 60_000),
      signature: 'a'.repeat(64),
      snapshot: {
        address: {
          id: addressId,
          name: 'A User',
          phone: '9876543210',
          street: '1 Main Road',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '411001',
        },
        items: [
          {
            cartItemId: objectId(),
            product: {
              id: objectId(),
              name: 'Product',
              slug: 'product',
              images: [],
            },
            variant: null,
            quantity: 1,
            unitPrice: 100,
            lineTotal: 100,
          },
        ],
        subtotal: 100,
        shippingFee: 99,
        shipping: { fee: 99, freeShippingThreshold: 1000, isFree: false },
        tax: { rate: 0.18, amount: 18 },
        grandTotal: 217,
        currency: 'INR',
      },
    });

    expect(session.snapshot.items[0].variant).toBeNull();
    await expect(session.validate()).resolves.toBeUndefined();
  });

  it('requires an owner, address, expiry, signed snapshot and trusted totals', async () => {
    const session = new CheckoutSession({});

    await expect(session.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        user: expect.anything(),
        address: expect.anything(),
        expiresAt: expect.anything(),
        signature: expect.anything(),
      }),
    });
  });

  it('defines an atomic one-open-session index and TTL expiry index', () => {
    const indexes = CheckoutSession.schema.indexes();

    expect(indexes).toContainEqual([
      { user: 1 },
      expect.objectContaining({
        unique: true,
        partialFilterExpression: { status: 'open' },
        name: 'one_open_checkout_session_per_user',
      }),
    ]);
    expect(indexes).toContainEqual([
      { expiresAt: 1 },
      expect.objectContaining({ expireAfterSeconds: 0, name: 'checkout_session_expiry' }),
    ]);
  });
});
