jest.mock('../src/config/firebaseAdmin', () => ({
  verifyIdToken: jest.fn(),
}));

jest.mock('../src/models/User', () => ({
  findOne: jest.fn(),
}));

jest.mock('../src/services/cart.service', () => ({
  addProduct: jest.fn(),
  clearCart: jest.fn(),
  getCart: jest.fn(),
  removeItem: jest.fn(),
  updateItemQuantity: jest.fn(),
}));

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const cartService = require('../src/services/cart.service');
const { verifyIdToken } = require('../src/config/firebaseAdmin');

const mongoUserId = '0123456789abcdef01234567';
const productId = 'abcdef0123456789abcdef01';
const variantId = 'abcdef0123456789abcdef02';
const itemId = 'abcdef0123456789abcdef03';
const cartResult = {
  cart: { _id: 'cart-id', items: [] },
  subtotal: 0,
  itemCount: 0,
};

describe('Cart API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyIdToken.mockImplementation(async (token) => ({
      uid: token,
      email: token === 'second-user' ? 'second@example.com' : 'customer@example.com',
    }));
    User.findOne.mockImplementation(async ({ email }) => ({
      _id: email === 'second@example.com' ? '1123456789abcdef01234567' : mongoUserId,
    }));
    cartService.getCart.mockResolvedValue(cartResult);
    cartService.addProduct.mockResolvedValue(cartResult);
    cartService.updateItemQuantity.mockResolvedValue(cartResult);
    cartService.removeItem.mockResolvedValue(cartResult);
    cartService.clearCart.mockResolvedValue(cartResult);
  });

  it('requires authentication for every cart endpoint', async () => {
    const responses = await Promise.all([
      request(app).get('/api/cart'),
      request(app).post('/api/cart/items').send({ productId, quantity: 1 }),
      request(app).patch(`/api/cart/items/${itemId}`).send({ quantity: 2 }),
      request(app).delete(`/api/cart/items/${itemId}`),
      request(app).delete('/api/cart'),
    ]);

    expect(responses.map((response) => response.status)).toEqual([401, 401, 401, 401, 401]);
    expect(cartService.getCart).not.toHaveBeenCalled();
  });

  it('gets only the authenticated user cart, ignoring client-supplied identity', async () => {
    const response = await request(app)
      .get(`/api/cart?userId=${'1123456789abcdef01234567'}`)
      .set('Authorization', 'Bearer first-user');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, data: cartResult });
    expect(User.findOne).toHaveBeenCalledWith({ email: 'customer@example.com' });
    expect(cartService.getCart).toHaveBeenCalledWith(mongoUserId);
  });

  it('adds product or variant items using only validated client fields', async () => {
    const response = await request(app)
      .post('/api/cart/items')
      .set('Authorization', 'Bearer first-user')
      .send({ productId, variantId, quantity: 2 });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ success: true, data: cartResult });
    expect(cartService.addProduct).toHaveBeenCalledWith(mongoUserId, {
      productId,
      variantId,
      quantity: 2,
    });
  });

  it('rejects invalid IDs, quantities, and client-supplied price or user fields', async () => {
    const invalidRequests = [
      request(app)
        .post('/api/cart/items')
        .set('Authorization', 'Bearer first-user')
        .send({ productId: 'invalid', quantity: 1 }),
      request(app)
        .post('/api/cart/items')
        .set('Authorization', 'Bearer first-user')
        .send({ productId, quantity: 0 }),
      request(app)
        .post('/api/cart/items')
        .set('Authorization', 'Bearer first-user')
        .send({ productId, quantity: 1, price: 0.01 }),
      request(app)
        .post('/api/cart/items')
        .set('Authorization', 'Bearer first-user')
        .send({ productId, quantity: 1, userId: '1123456789abcdef01234567' }),
      request(app)
        .patch('/api/cart/items/invalid')
        .set('Authorization', 'Bearer first-user')
        .send({ quantity: 1 }),
      request(app)
        .patch(`/api/cart/items/${itemId}`)
        .set('Authorization', 'Bearer first-user')
        .send({ quantity: 100 }),
    ];

    const responses = await Promise.all(invalidRequests);
    expect(responses.map((response) => response.status)).toEqual([400, 400, 400, 400, 400, 400]);
    expect(cartService.addProduct).not.toHaveBeenCalled();
    expect(cartService.updateItemQuantity).not.toHaveBeenCalled();
  });

  it('updates and removes an item scoped to the token-derived Mongo user', async () => {
    const updated = await request(app)
      .patch(`/api/cart/items/${itemId}`)
      .set('Authorization', 'Bearer second-user')
      .send({ quantity: 3 });
    const removed = await request(app)
      .delete(`/api/cart/items/${itemId}`)
      .set('Authorization', 'Bearer second-user');

    expect(updated.status).toBe(200);
    expect(removed.status).toBe(200);
    expect(User.findOne).toHaveBeenCalledWith({ email: 'second@example.com' });
    expect(cartService.updateItemQuantity).toHaveBeenCalledWith(
      '1123456789abcdef01234567',
      itemId,
      3,
    );
    expect(cartService.removeItem).toHaveBeenCalledWith('1123456789abcdef01234567', itemId);
  });

  it('clears only the authenticated user cart', async () => {
    const response = await request(app)
      .delete('/api/cart')
      .set('Authorization', 'Bearer second-user');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, data: cartResult });
    expect(cartService.clearCart).toHaveBeenCalledWith('1123456789abcdef01234567');
  });

  it('reports an unsynced verified account profile', async () => {
    User.findOne.mockResolvedValueOnce(null);

    const response = await request(app).get('/api/cart').set('Authorization', 'Bearer first-user');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      success: false,
      message: 'User profile not found. Sync your profile first.',
    });
    expect(cartService.getCart).not.toHaveBeenCalled();
  });

  it('returns service stock and ownership errors with their HTTP status', async () => {
    const error = Object.assign(new Error('Requested quantity exceeds available stock'), {
      statusCode: 409,
    });
    cartService.addProduct.mockRejectedValueOnce(error);

    const response = await request(app)
      .post('/api/cart/items')
      .set('Authorization', 'Bearer first-user')
      .send({ productId, quantity: 2 });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Requested quantity exceeds available stock',
    });
  });
});
