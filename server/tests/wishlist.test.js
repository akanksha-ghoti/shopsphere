jest.mock('../src/config/firebaseAdmin', () => ({
  verifyIdToken: jest.fn(),
}));

jest.mock('../src/models/User', () => ({
  findOne: jest.fn(),
}));

jest.mock('../src/models/Product', () => ({
  findById: jest.fn(),
}));

jest.mock('../src/models/Wishlist', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndDelete: jest.fn(),
}));

jest.mock('../src/services/cart.service', () => ({
  addProduct: jest.fn(),
}));

const request = require('supertest');
const app = require('../src/app');
const { verifyIdToken } = require('../src/config/firebaseAdmin');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Wishlist = require('../src/models/Wishlist');
const cartService = require('../src/services/cart.service');

const userId = '0123456789abcdef01234567';
const otherUserId = '1123456789abcdef01234567';
const productId = 'abcdef0123456789abcdef01';
const productSummary = {
  _id: productId,
  name: 'Test product',
  slug: 'test-product',
  price: 99,
  images: [],
};
const wishlistEntry = { _id: 'wishlist-entry', user: userId, product: productId };

describe('Wishlist API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyIdToken.mockImplementation(async (token) => ({
      uid: token,
      email: token === 'other-user' ? 'other@example.com' : 'user@example.com',
    }));
    User.findOne.mockImplementation(async ({ email }) => ({
      _id: email === 'other@example.com' ? otherUserId : userId,
    }));
    Product.findById.mockResolvedValue(productSummary);
    Wishlist.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([wishlistEntry]),
      }),
    });
    Wishlist.findOne.mockResolvedValue(null);
    Wishlist.create.mockResolvedValue(wishlistEntry);
    Wishlist.findOneAndDelete.mockResolvedValue(wishlistEntry);
    cartService.addProduct.mockResolvedValue({
      cart: { _id: 'cart-id' },
      items: [],
      subtotal: 99,
      itemCount: 1,
    });
  });

  it('requires authentication for wishlist endpoints', async () => {
    const responses = await Promise.all([
      request(app).get('/api/wishlist'),
      request(app).post('/api/wishlist').send({ productId }),
      request(app).delete(`/api/wishlist/${productId}`),
      request(app).post(`/api/wishlist/${productId}/move-to-cart`),
    ]);

    expect(responses.map((response) => response.status)).toEqual([401, 401, 401, 401]);
    expect(Wishlist.find).not.toHaveBeenCalled();
    expect(Wishlist.create).not.toHaveBeenCalled();
  });

  it('returns only the authenticated user wishlist with product summaries populated', async () => {
    const response = await request(app)
      .get('/api/wishlist')
      .set('Authorization', 'Bearer first-user');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: [wishlistEntry],
    });
    expect(Wishlist.find).toHaveBeenCalledWith({ user: userId });
    expect(Wishlist.find.mock.results[0].value.populate).toHaveBeenCalledWith(
      'product',
      'name slug price images',
    );
  });

  it('adds an existing product to the signed-in user wishlist', async () => {
    const response = await request(app)
      .post('/api/wishlist')
      .set('Authorization', 'Bearer first-user')
      .send({ productId });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ success: true, data: wishlistEntry });
    expect(Product.findById).toHaveBeenCalledWith(productId);
    expect(Wishlist.create).toHaveBeenCalledWith({ user: userId, product: productId });
  });

  it('makes duplicate additions idempotent', async () => {
    Wishlist.findOne.mockResolvedValueOnce(wishlistEntry);

    const response = await request(app)
      .post('/api/wishlist')
      .set('Authorization', 'Bearer first-user')
      .send({ productId });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Wishlist.create).not.toHaveBeenCalled();
  });

  it('recovers concurrent duplicate additions using the unique pair index', async () => {
    const duplicateError = Object.assign(new Error('duplicate key'), { code: 11000 });
    Wishlist.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(wishlistEntry);
    Wishlist.create.mockRejectedValueOnce(duplicateError);

    const response = await request(app)
      .post('/api/wishlist')
      .set('Authorization', 'Bearer first-user')
      .send({ productId });

    expect(response.status).toBe(200);
    expect(Wishlist.findOne).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid and missing product IDs', async () => {
    const invalid = await request(app)
      .post('/api/wishlist')
      .set('Authorization', 'Bearer first-user')
      .send({ productId: 'not-an-object-id' });
    Product.findById.mockResolvedValueOnce(null);
    const missing = await request(app)
      .post('/api/wishlist')
      .set('Authorization', 'Bearer first-user')
      .send({ productId: 'abcdef0123456789abcdef02' });

    expect(invalid.status).toBe(400);
    expect(Wishlist.create).not.toHaveBeenCalled();
    expect(missing.status).toBe(404);
  });

  it('rejects unexpected body fields including user IDs', async () => {
    const response = await request(app)
      .post('/api/wishlist')
      .set('Authorization', 'Bearer first-user')
      .send({ productId, userId: otherUserId });

    expect(response.status).toBe(400);
    expect(Wishlist.create).not.toHaveBeenCalled();
  });

  it('removes a product only from the authenticated user wishlist', async () => {
    const response = await request(app)
      .delete(`/api/wishlist/${productId}`)
      .set('Authorization', 'Bearer other-user');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, data: null });
    expect(Wishlist.findOneAndDelete).toHaveBeenCalledWith({
      user: otherUserId,
      product: productId,
    });
  });

  it('does not expose wishlist entries owned by other users', async () => {
    Wishlist.findOneAndDelete.mockResolvedValueOnce(null);

    const response = await request(app)
      .delete(`/api/wishlist/${productId}`)
      .set('Authorization', 'Bearer first-user');

    expect(response.status).toBe(404);
    expect(Wishlist.findOneAndDelete).toHaveBeenCalledWith({
      user: userId,
      product: productId,
    });
  });

  it('rejects invalid product IDs for deletion', async () => {
    const response = await request(app)
      .delete('/api/wishlist/invalid')
      .set('Authorization', 'Bearer first-user');

    expect(response.status).toBe(400);
    expect(Wishlist.findOneAndDelete).not.toHaveBeenCalled();
  });

  it('moves a wishlist product to the authenticated user cart then removes the entry', async () => {
    Wishlist.findOne.mockResolvedValueOnce(wishlistEntry);

    const response = await request(app)
      .post(`/api/wishlist/${productId}/move-to-cart`)
      .set('Authorization', 'Bearer first-user');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: 'Product moved to cart',
      data: {
        productId,
        cart: { subtotal: 99, itemCount: 1 },
      },
    });
    expect(Wishlist.findOne).toHaveBeenCalledWith({
      user: userId,
      product: productId,
    });
    expect(cartService.addProduct).toHaveBeenCalledWith(userId, {
      productId,
      quantity: 1,
    });
    expect(Wishlist.findOneAndDelete).toHaveBeenCalledWith({
      _id: wishlistEntry._id,
      user: userId,
      product: productId,
    });
  });

  it('returns not found when the product is not in this user wishlist', async () => {
    Wishlist.findOne.mockResolvedValueOnce(null);

    const response = await request(app)
      .post(`/api/wishlist/${productId}/move-to-cart`)
      .set('Authorization', 'Bearer other-user');

    expect(response.status).toBe(404);
    expect(Wishlist.findOne).toHaveBeenCalledWith({
      user: otherUserId,
      product: productId,
    });
    expect(cartService.addProduct).not.toHaveBeenCalled();
    expect(Wishlist.findOneAndDelete).not.toHaveBeenCalled();
  });

  it('preserves the wishlist entry when cart stock validation fails', async () => {
    Wishlist.findOne.mockResolvedValueOnce(wishlistEntry);
    cartService.addProduct.mockRejectedValueOnce(
      Object.assign(new Error('Requested quantity exceeds available stock'), {
        statusCode: 409,
      }),
    );

    const response = await request(app)
      .post(`/api/wishlist/${productId}/move-to-cart`)
      .set('Authorization', 'Bearer first-user');

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/available stock/i);
    expect(Wishlist.findOneAndDelete).not.toHaveBeenCalled();
  });

  it('preserves the wishlist entry when adding to cart fails', async () => {
    Wishlist.findOne.mockResolvedValueOnce(wishlistEntry);
    cartService.addProduct.mockRejectedValueOnce(
      Object.assign(new Error('Cart service unavailable'), { statusCode: 503 }),
    );

    const response = await request(app)
      .post(`/api/wishlist/${productId}/move-to-cart`)
      .set('Authorization', 'Bearer first-user');

    expect(response.status).toBe(503);
    expect(Wishlist.findOneAndDelete).not.toHaveBeenCalled();
  });

  it('rejects invalid product IDs for move-to-cart', async () => {
    const response = await request(app)
      .post('/api/wishlist/not-an-id/move-to-cart')
      .set('Authorization', 'Bearer first-user');

    expect(response.status).toBe(400);
    expect(cartService.addProduct).not.toHaveBeenCalled();
  });
});
