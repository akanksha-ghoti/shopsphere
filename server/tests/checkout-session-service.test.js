jest.mock('../src/models/Address', () => ({
  findOne: jest.fn(),
}));

jest.mock('../src/models/CheckoutSession', () => {
  const mongoose = require('mongoose');
  return jest.fn().mockImplementation(function CheckoutSession(data) {
    Object.assign(this, data);
    this._id = new mongoose.Types.ObjectId();
    this.save = jest.fn().mockResolvedValue(this);
  });
});

jest.mock('../src/services/checkout.service', () => ({
  createSummary: jest.fn(),
}));

const Address = require('../src/models/Address');
const CheckoutSession = require('../src/models/CheckoutSession');
const checkoutService = require('../src/services/checkout.service');
const sessionService = require('../src/services/checkoutSession.service');

const userId = '0123456789abcdef01234567';
const addressId = 'abcdef0123456789abcdef01';
const sessionId = '1234567890abcdef12345678';

function makeSummary() {
  return {
    address: {
      _id: addressId,
      name: 'A User',
      phone: '9876543210',
      street: '1 Main Road',
      addressLine2: '',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
    },
    items: [
      {
        _id: 'abcdef0123456789abcdef02',
        product: {
          _id: 'abcdef0123456789abcdef03',
          name: 'Product',
          slug: 'product',
          images: ['product.png'],
        },
        variant: null,
        quantity: 2,
        unitPrice: 100,
        lineTotal: 200,
      },
    ],
    subtotal: 200,
    shippingFee: 99,
    shipping: { fee: 99, freeShippingThreshold: 1000, isFree: false },
    tax: { rate: 0.18, amount: 36 },
    grandTotal: 335,
    currency: 'INR',
  };
}

describe('Checkout session service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    CheckoutSession.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 0 });
    CheckoutSession.findOne = jest.fn().mockResolvedValue(null);
    Address.findOne.mockResolvedValue({ _id: addressId, user: userId });
    checkoutService.createSummary.mockResolvedValue(makeSummary());
  });

  it('creates a short-lived signed snapshot from server-calculated checkout data', async () => {
    const before = Date.now();
    const result = await sessionService.createSession(userId, addressId);
    const after = Date.now();
    const savedSession = CheckoutSession.mock.instances[0];

    expect(checkoutService.createSummary).toHaveBeenCalledWith(userId, addressId);
    expect(savedSession.status).toBe('open');
    expect(savedSession.signature).toMatch(/^[a-f\d]{64}$/);
    expect(savedSession.snapshot).toMatchObject({
      items: [{ quantity: 2, unitPrice: 100, lineTotal: 200 }],
      subtotal: 200,
      shippingFee: 99,
      tax: { amount: 36 },
      grandTotal: 335,
    });
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThanOrEqual(before + 15 * 60 * 1000);
    expect(new Date(result.expiresAt).getTime()).toBeLessThanOrEqual(after + 15 * 60 * 1000);
    expect(result).not.toHaveProperty('signature');
  });

  it('rejects a second open checkout session and marks expired sessions before creation', async () => {
    CheckoutSession.findOne.mockResolvedValueOnce({ _id: sessionId });
    await expect(sessionService.createSession(userId, addressId)).rejects.toMatchObject({
      statusCode: 409,
      code: 'OPEN_CHECKOUT_SESSION_EXISTS',
    });
    expect(CheckoutSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ user: userId, status: 'open' }),
      { $set: { status: 'expired' } },
    );

    CheckoutSession.findOne.mockResolvedValueOnce(null);
    await sessionService.createSession(userId, addressId);
    expect(CheckoutSession).toHaveBeenCalledTimes(1);
  });

  it('maps a concurrent unique-index conflict to the open-session error', async () => {
    const duplicateError = Object.assign(new Error('duplicate key'), { code: 11000 });
    CheckoutSession.mockImplementationOnce(function DuplicateCheckoutSession(data) {
      Object.assign(this, data);
      this._id = new (require('mongoose').Types.ObjectId)();
      this.save = jest.fn().mockRejectedValue(duplicateError);
    });

    await expect(sessionService.createSession(userId, addressId)).rejects.toMatchObject({
      statusCode: 409,
      code: 'OPEN_CHECKOUT_SESSION_EXISTS',
    });
  });

  it('rejects invalid IDs, missing sessions and sessions owned by another user', async () => {
    await expect(sessionService.createSession(userId, 'invalid')).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_ID',
    });
    await expect(sessionService.validateSession(userId, 'invalid')).rejects.toMatchObject({
      statusCode: 400,
      code: 'INVALID_ID',
    });

    CheckoutSession.findOne.mockResolvedValue(null);
    await expect(sessionService.validateSession(userId, sessionId)).rejects.toMatchObject({
      statusCode: 404,
      code: 'CHECKOUT_SESSION_NOT_FOUND',
    });
    expect(CheckoutSession.findOne).toHaveBeenCalledWith({ _id: sessionId, user: userId });
  });

  it('rejects expired sessions before integrity validation', async () => {
    CheckoutSession.findOne.mockResolvedValue({
      _id: sessionId,
      user: userId,
      address: addressId,
      status: 'open',
      expiresAt: new Date(Date.now() - 1),
      snapshot: makeSummary(),
      signature: '0'.repeat(64),
    });

    await expect(sessionService.validateSession(userId, sessionId)).rejects.toMatchObject({
      statusCode: 410,
      code: 'CHECKOUT_SESSION_EXPIRED',
    });
    expect(Address.findOne).not.toHaveBeenCalled();
  });

  it('rejects snapshots changed after signing', async () => {
    await sessionService.createSession(userId, addressId);
    const savedSession = CheckoutSession.mock.instances[0];
    savedSession.snapshot.grandTotal += 1;
    CheckoutSession.findOne.mockResolvedValue(savedSession);

    await expect(sessionService.validateSession(userId, savedSession._id)).rejects.toMatchObject({
      statusCode: 409,
      code: 'CHECKOUT_SESSION_TAMPERED',
    });
    expect(Address.findOne).not.toHaveBeenCalled();
  });

  it('rejects malformed or invalid-expiry session records as tampered', async () => {
    await sessionService.createSession(userId, addressId);
    const savedSession = CheckoutSession.mock.instances[0];
    const snapshot = savedSession.snapshot;
    savedSession.snapshot.items = null;
    CheckoutSession.findOne.mockResolvedValueOnce(savedSession);

    await expect(sessionService.validateSession(userId, savedSession._id)).rejects.toMatchObject({
      statusCode: 409,
      code: 'CHECKOUT_SESSION_TAMPERED',
    });

    savedSession.snapshot = snapshot;
    savedSession.expiresAt = new Date('invalid');
    CheckoutSession.findOne.mockResolvedValueOnce(savedSession);
    await expect(sessionService.validateSession(userId, savedSession._id)).rejects.toMatchObject({
      statusCode: 409,
      code: 'CHECKOUT_SESSION_TAMPERED',
    });
  });

  it('revalidates address ownership before returning a valid session', async () => {
    await sessionService.createSession(userId, addressId);
    const savedSession = CheckoutSession.mock.instances[0];
    CheckoutSession.findOne.mockResolvedValue(savedSession);

    Address.findOne.mockResolvedValueOnce(null);
    await expect(sessionService.validateSession(userId, savedSession._id)).rejects.toMatchObject({
      statusCode: 409,
      code: 'CHECKOUT_ADDRESS_UNAVAILABLE',
    });

    Address.findOne.mockResolvedValueOnce({ _id: addressId, user: userId });
    await expect(sessionService.validateSession(userId, savedSession._id)).resolves.toMatchObject({
      sessionId: String(savedSession._id),
      snapshot: { grandTotal: 335 },
    });
  });
});
