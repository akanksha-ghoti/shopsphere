const mongoose = require('mongoose');
const Product = require('../src/models/Product');

const validProduct = {
  name: 'Test product',
  slug: 'test-product',
  description: 'A product for schema validation',
  price: 100,
  stock: 10,
  category: new mongoose.Types.ObjectId(),
};

describe('Product variant schema', () => {
  it('keeps existing products without variants valid', async () => {
    const product = new Product(validProduct);

    await expect(product.validate()).resolves.toBeUndefined();
    expect(product.variants).toHaveLength(0);
  });

  it('uses the parent product price as the variant fallback', () => {
    const product = new Product({
      ...validProduct,
      variants: [{ size: 'M', color: 'Blue', sku: 'SHIRT-BLU-M', stock: 3 }],
    });

    expect(product.variants[0].effectivePrice).toBe(100);
    expect(product.variants[0].stock).toBe(3);
    expect(product.stock).toBe(10);
    const serialized = product.toJSON();
    expect(serialized.variants[0].effectivePrice).toBe(100);
    expect(serialized).not.toHaveProperty('id');
  });

  it('uses a variant price override without changing parent price', () => {
    const product = new Product({
      ...validProduct,
      variants: [
        {
          size: 'M',
          color: 'Blue',
          sku: 'SHIRT-BLU-M',
          price: 125,
          stock: 3,
        },
      ],
    });

    expect(product.variants[0].effectivePrice).toBe(125);
    expect(product.price).toBe(100);
  });

  it('validates required fields, SKU format, non-negative override, and integer stock', async () => {
    const product = new Product({
      ...validProduct,
      variants: [{ size: '', color: '', sku: 'bad sku', price: -1, stock: -1.5 }],
    });

    await expect(product.validate()).rejects.toMatchObject({
      name: 'ValidationError',
    });
  });

  it('rejects duplicate SKUs within one product document', async () => {
    const product = new Product({
      ...validProduct,
      variants: [
        { size: 'S', color: 'Blue', sku: 'SHIRT-BLU-S', stock: 2 },
        { size: 'M', color: 'Blue', sku: 'shirt-blu-s', stock: 3 },
      ],
    });

    await expect(product.validate()).rejects.toMatchObject({
      name: 'ValidationError',
    });
  });

  it('defines a unique sparse SKU index across product documents', () => {
    const skuIndex = Product.schema.indexes().find(([keys]) => keys['variants.sku'] === 1);

    expect(skuIndex).toBeDefined();
    expect(skuIndex[1]).toMatchObject({
      unique: true,
      partialFilterExpression: { 'variants.sku': { $type: 'string' } },
      name: 'variants_sku_unique',
    });
  });
});
