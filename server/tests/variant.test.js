jest.mock('../src/models/Product', () => ({
  exists: jest.fn(),
  findById: jest.fn(),
  findOneAndUpdate: jest.fn(),
}));

jest.mock('../src/config/firebaseAdmin', () => ({
  verifyIdToken: jest.fn(),
}));

const request = require('supertest');
const app = require('../src/app');
const Product = require('../src/models/Product');
const { verifyIdToken } = require('../src/config/firebaseAdmin');

const productId = 'abcdef0123456789abcdef01';
const variantId = '0123456789abcdef01234567';
const secondVariantId = '1123456789abcdef01234567';
const authorization = 'Bearer admin-token';
const variantInput = {
  size: 'Medium',
  color: 'Blue',
  sku: 'SHIRT-BLU-M',
  stock: 5,
};

function makeProduct(variants = []) {
  const productVariants = [...variants];
  productVariants.id = (id) => productVariants.find((variant) => variant._id === id);

  return {
    _id: productId,
    price: 100,
    stock: 20,
    variants: productVariants,
  };
}

describe('Product variant API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyIdToken.mockResolvedValue({ uid: 'admin-user', admin: true });
  });

  it('creates a variant and leaves parent price and stock untouched', async () => {
    const variant = { _id: variantId, ...variantInput };
    Product.findOneAndUpdate.mockResolvedValue(makeProduct([variant]));

    const response = await request(app)
      .post(`/api/products/${productId}/variants`)
      .set('Authorization', authorization)
      .send(variantInput);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data._id).toBe(variantId);
    expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: productId, 'variants.sku': { $ne: 'SHIRT-BLU-M' } },
      { $push: { variants: variantInput } },
      { new: true, runValidators: true },
    );
    expect(Product.findOneAndUpdate.mock.calls[0][1].$set).toBeUndefined();
  });

  it('rejects duplicate SKUs across product documents via the unique index', async () => {
    Product.findOneAndUpdate.mockRejectedValueOnce({ code: 11000 });

    const response = await request(app)
      .post(`/api/products/${productId}/variants`)
      .set('Authorization', authorization)
      .send(variantInput);

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/SKU already exists/i);
  });

  it('rejects a SKU already used by another variant on the same product', async () => {
    Product.findOneAndUpdate.mockResolvedValueOnce(null);
    Product.exists.mockResolvedValueOnce({ _id: productId });

    const response = await request(app)
      .post(`/api/products/${productId}/variants`)
      .set('Authorization', authorization)
      .send(variantInput);

    expect(response.status).toBe(409);
  });

  it('updates only variant fields without changing product price or stock', async () => {
    const variant = {
      _id: variantId,
      ...variantInput,
      stock: 2,
      price: 120,
    };
    Product.findOneAndUpdate.mockResolvedValue(makeProduct([variant]));

    const response = await request(app)
      .patch(`/api/products/${productId}/variants/${variantId}`)
      .set('Authorization', authorization)
      .send({ price: 120, stock: 2 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: productId, 'variants._id': variantId },
      {
        $set: {
          'variants.$[variant].price': 120,
          'variants.$[variant].stock': 2,
        },
      },
      {
        new: true,
        runValidators: true,
        arrayFilters: [{ 'variant._id': variantId }],
      },
    );
    expect(Product.findOneAndUpdate.mock.calls[0][1].$set).not.toHaveProperty('price');
    expect(Product.findOneAndUpdate.mock.calls[0][1].$set).not.toHaveProperty('stock');
  });

  it('rejects an update to a SKU already used by a sibling variant', async () => {
    Product.findOneAndUpdate.mockResolvedValueOnce(null);
    Product.findById.mockResolvedValueOnce(
      makeProduct([
        { _id: variantId, ...variantInput },
        { _id: secondVariantId, ...variantInput, sku: 'OTHER-SKU' },
      ]),
    );

    const response = await request(app)
      .patch(`/api/products/${productId}/variants/${secondVariantId}`)
      .set('Authorization', authorization)
      .send({ sku: variantInput.sku });

    expect(response.status).toBe(409);
  });

  it('rejects invalid variant price, stock, and SKU values', async () => {
    for (const invalidBody of [
      { ...variantInput, price: -1 },
      { ...variantInput, stock: 1.5 },
      { ...variantInput, sku: 'bad sku' },
    ]) {
      const response = await request(app)
        .post(`/api/products/${productId}/variants`)
        .set('Authorization', authorization)
        .send(invalidBody);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    }

    expect(Product.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('removes a variant without changing its parent product', async () => {
    Product.findOneAndUpdate.mockResolvedValue(makeProduct([]));

    const response = await request(app)
      .delete(`/api/products/${productId}/variants/${variantId}`)
      .set('Authorization', authorization);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Product.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: productId, 'variants._id': variantId },
      { $pull: { variants: { _id: variantId } } },
      { new: true },
    );
  });

  it.each([
    ['POST', '/api/products/not-an-id/variants', variantInput],
    ['PATCH', `/api/products/${productId}/variants/not-an-id`, { stock: 3 }],
    ['DELETE', `/api/products/${productId}/variants/not-an-id`, undefined],
  ])('rejects malformed product or variant IDs (%s)', async (method, path, body) => {
    let requestBuilder = request(app)[method.toLowerCase()](path);

    if (body) {
      requestBuilder = requestBuilder.send(body);
    }

    const response = await requestBuilder.set('Authorization', authorization);

    expect(response.status).toBe(400);
    expect(Product.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns 404 when the product does not exist', async () => {
    Product.findOneAndUpdate.mockResolvedValueOnce(null);
    Product.exists.mockResolvedValueOnce(null);

    const response = await request(app)
      .post(`/api/products/${productId}/variants`)
      .set('Authorization', authorization)
      .send(variantInput);

    expect(response.status).toBe(404);
  });

  it('returns 404 when the variant does not exist', async () => {
    Product.findOneAndUpdate.mockResolvedValueOnce(null);
    Product.findById.mockResolvedValueOnce(makeProduct([]));

    const response = await request(app)
      .patch(`/api/products/${productId}/variants/${variantId}`)
      .set('Authorization', authorization)
      .send({ stock: 3 });

    expect(response.status).toBe(404);
  });

  it.each([
    ['POST', `/api/products/${productId}/variants`, variantInput],
    ['PATCH', `/api/products/${productId}/variants/${variantId}`, { stock: 1 }],
    ['DELETE', `/api/products/${productId}/variants/${variantId}`, undefined],
  ])('requires admin authentication for %s variant writes', async (method, path, body) => {
    const response = await request(app)
      [method.toLowerCase()](path)
      .send(body || {});

    expect(response.status).toBe(401);
  });

  it('rejects authenticated non-admin variant writes', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'customer-user' });

    const response = await request(app)
      .post(`/api/products/${productId}/variants`)
      .set('Authorization', 'Bearer customer-token')
      .send(variantInput);

    expect(response.status).toBe(403);
    expect(Product.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
