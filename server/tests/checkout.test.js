jest.mock('../src/config/firebaseAdmin', () => ({
  verifyIdToken: jest.fn(),
}));

jest.mock('../src/models/User', () => ({
  findOne: jest.fn(),
}));

jest.mock('../src/services/checkout.service', () => ({
  createSummary: jest.fn(),
}));

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const checkoutService = require('../src/services/checkout.service');
const { verifyIdToken } = require('../src/config/firebaseAdmin');

const userId = '0123456789abcdef01234567';
const addressId = 'abcdef0123456789abcdef01';

describe('Checkout summary API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyIdToken.mockResolvedValue({
      uid: 'checkout-test-user',
      email: 'customer@example.com',
    });
    User.findOne.mockResolvedValue({ _id: userId });
    checkoutService.createSummary.mockResolvedValue({
      items: [],
      subtotal: 100,
      shippingFee: 99,
      tax: { rate: 0.18, amount: 18 },
      grandTotal: 217,
      currency: 'INR',
    });
  });

  it('requires authentication', async () => {
    const response = await request(app).post('/api/checkout/summary').send({ addressId });

    expect(response.status).toBe(401);
    expect(checkoutService.createSummary).not.toHaveBeenCalled();
  });

  it('uses authenticated user and validated address ID and returns a summary', async () => {
    const response = await request(app)
      .post('/api/checkout/summary')
      .set('Authorization', 'Bearer checkout-test-user')
      .send({ addressId });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { subtotal: 100, shippingFee: 99, grandTotal: 217 },
    });
    expect(checkoutService.createSummary).toHaveBeenCalledWith(userId, addressId);
  });

  it('rejects invalid IDs and untrusted client totals or prices', async () => {
    const invalidId = await request(app)
      .post('/api/checkout/summary')
      .set('Authorization', 'Bearer checkout-test-user')
      .send({ addressId: 'invalid' });
    const untrustedValues = await request(app)
      .post('/api/checkout/summary')
      .set('Authorization', 'Bearer checkout-test-user')
      .send({ addressId, subtotal: 0, tax: 0, grandTotal: 0, price: 0 });

    expect(invalidId.status).toBe(400);
    expect(untrustedValues.status).toBe(400);
    expect(checkoutService.createSummary).not.toHaveBeenCalled();
  });

  it('returns service errors using their HTTP status', async () => {
    checkoutService.createSummary.mockRejectedValueOnce(
      Object.assign(new Error('Add items to your cart before checkout'), {
        statusCode: 400,
      }),
    );

    const response = await request(app)
      .post('/api/checkout/summary')
      .set('Authorization', 'Bearer checkout-test-user')
      .send({ addressId });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/cart/i);
  });
});
