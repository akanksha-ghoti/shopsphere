jest.mock('../src/models/Product', () => ({
  create: jest.fn(),
  countDocuments: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock('../src/models/Category', () => ({
  findById: jest.fn(),
}));

jest.mock('../src/config/firebaseAdmin', () => ({
  verifyIdToken: jest.fn(),
}));

const request = require('supertest');
const app = require('../src/app');
const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const { verifyIdToken } = require('../src/config/firebaseAdmin');

const categoryId = '0123456789abcdef01234567';
const productId = 'abcdef0123456789abcdef01';
const adminAuthorization = 'Bearer admin-token';
const productInput = {
  name: 'Wireless Mouse',
  description: 'Ergonomic wireless mouse',
  price: 799,
  stock: 25,
  category: categoryId,
};

function makeProduct(overrides = {}) {
  return {
    _id: productId,
    ...productInput,
    slug: 'wireless-mouse',
    isActive: true,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function mockProductList(products) {
  const limit = jest.fn().mockResolvedValue(products);
  const skip = jest.fn().mockReturnValue({ limit });
  const sort = jest.fn().mockReturnValue({ skip });
  const populate = jest.fn().mockReturnValue({ sort });
  Product.find.mockReturnValue({ populate });
}

describe('Product API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyIdToken.mockResolvedValue({ uid: 'admin-user', admin: true });
    Category.findById.mockResolvedValue({ _id: categoryId, isActive: true });
    Product.findOne.mockResolvedValue(null);
  });

  it('creates a product with a unique slug', async () => {
    const product = makeProduct();
    Product.create.mockResolvedValue(product);

    const response = await request(app)
      .post('/api/products')
      .set('Authorization', adminAuthorization)
      .send(productInput);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data._id).toBe(productId);
    expect(response.body.data.slug).toBe('wireless-mouse');
    expect(Product.create).toHaveBeenCalledWith({
      ...productInput,
      slug: 'wireless-mouse',
    });
  });

  it('uses a suffix when the product slug already exists', async () => {
    Product.findOne.mockResolvedValueOnce({ _id: 'existing-product' }).mockResolvedValueOnce(null);
    Product.create.mockResolvedValue(makeProduct({ slug: 'wireless-mouse-1' }));

    const response = await request(app)
      .post('/api/products')
      .set('Authorization', adminAuthorization)
      .send(productInput);

    expect(response.status).toBe(201);
    expect(Product.create).toHaveBeenCalledWith({
      ...productInput,
      slug: 'wireless-mouse-1',
    });
  });

  it('lists products with pagination metadata', async () => {
    mockProductList([makeProduct()]);
    Product.countDocuments.mockResolvedValue(21);

    const response = await request(app).get('/api/products?page=2&limit=10');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.pagination).toEqual({
      total: 21,
      page: 2,
      limit: 10,
      totalPages: 3,
    });
  });

  it('searches products by text', async () => {
    mockProductList([makeProduct()]);
    Product.countDocuments.mockResolvedValue(1);

    const response = await request(app).get('/api/products').query({ search: 'wireless mouse' });

    expect(response.status).toBe(200);
    expect(Product.find).toHaveBeenCalledWith({
      $text: { $search: 'wireless mouse' },
    });
    expect(response.body.success).toBe(true);
  });

  it('filters products by category', async () => {
    mockProductList([makeProduct()]);
    Product.countDocuments.mockResolvedValue(1);

    const response = await request(app).get('/api/products').query({ category: categoryId });

    expect(response.status).toBe(200);
    expect(Product.find).toHaveBeenCalledWith({ category: categoryId });
  });

  it('gets one product and populates its category', async () => {
    const product = makeProduct();
    Product.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(product),
    });

    const response = await request(app).get(`/api/products/${productId}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data._id).toBe(productId);
    expect(Product.findById).toHaveBeenCalledWith(productId);
  });

  it('updates a product', async () => {
    const product = makeProduct();
    Product.findById.mockResolvedValue(product);

    const response = await request(app)
      .patch(`/api/products/${productId}`)
      .set('Authorization', adminAuthorization)
      .send({ price: 699, stock: 18 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(product.price).toBe(699);
    expect(product.stock).toBe(18);
    expect(product.save).toHaveBeenCalled();
  });

  it('deletes a product', async () => {
    Product.findByIdAndDelete.mockResolvedValue(makeProduct());

    const response = await request(app)
      .delete(`/api/products/${productId}`)
      .set('Authorization', adminAuthorization);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeNull();
    expect(Product.findByIdAndDelete).toHaveBeenCalledWith(productId);
  });

  it('rejects a negative price', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Authorization', adminAuthorization)
      .send({ ...productInput, price: -1 });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(Product.create).not.toHaveBeenCalled();
  });

  it('rejects negative and fractional stock', async () => {
    for (const stock of [-1, 1.5]) {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', adminAuthorization)
        .send({ ...productInput, stock });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    }

    expect(Product.create).not.toHaveBeenCalled();
  });

  it('rejects malformed or unavailable categories', async () => {
    const malformedIdResponse = await request(app)
      .post('/api/products')
      .set('Authorization', adminAuthorization)
      .send({ ...productInput, category: 'invalid' });

    expect(malformedIdResponse.status).toBe(400);
    expect(Category.findById).not.toHaveBeenCalled();

    Category.findById.mockResolvedValueOnce(null);
    const missingCategoryResponse = await request(app)
      .post('/api/products')
      .set('Authorization', adminAuthorization)
      .send(productInput);

    expect(missingCategoryResponse.status).toBe(400);
    expect(missingCategoryResponse.body.success).toBe(false);
    expect(Product.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid product ObjectId', async () => {
    const response = await request(app).get('/api/products/not-an-object-id');

    expect(response.status).toBe(400);
    expect(Product.findById).not.toHaveBeenCalled();
  });

  it.each([
    ['POST', '/api/products'],
    ['PATCH', `/api/products/${productId}`],
    ['DELETE', `/api/products/${productId}`],
  ])('requires authentication for %s %s', async (method, path) => {
    const response = await request(app)[method.toLowerCase()](path);

    expect(response.status).toBe(401);
  });

  it('rejects an authenticated non-admin', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'customer-user' });

    const response = await request(app)
      .post('/api/products')
      .set('Authorization', 'Bearer customer-token')
      .send(productInput);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(Product.create).not.toHaveBeenCalled();
  });

  it('returns a conflict if a duplicate slug is inserted concurrently', async () => {
    Product.create.mockRejectedValueOnce({ code: 11000 });

    const response = await request(app)
      .post('/api/products')
      .set('Authorization', adminAuthorization)
      .send(productInput);

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });
});
