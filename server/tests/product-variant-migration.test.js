jest.mock('../src/models/Product', () => ({
  aggregate: jest.fn(),
  updateMany: jest.fn(),
  collection: {
    createIndex: jest.fn(),
  },
}));

const Product = require('../src/models/Product');
const migrateProductVariants = require('../scripts/migrate-product-variants');

describe('Product variant migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('backfills missing variants and creates the global SKU index', async () => {
    Product.aggregate.mockResolvedValue([]);
    Product.updateMany.mockResolvedValue({ modifiedCount: 2 });
    Product.collection.createIndex.mockResolvedValue('variants_sku_unique');

    await expect(migrateProductVariants()).resolves.toBe(2);
    expect(Product.updateMany).toHaveBeenCalledWith(
      { $or: [{ variants: { $exists: false } }, { variants: null }] },
      { $set: { variants: [] } },
    );
    expect(Product.collection.createIndex).toHaveBeenCalledWith(
      { 'variants.sku': 1 },
      {
        unique: true,
        partialFilterExpression: { 'variants.sku': { $type: 'string' } },
        name: 'variants_sku_unique',
      },
    );
  });

  it('stops without changing data if duplicate SKUs already exist', async () => {
    Product.aggregate.mockResolvedValue([{ _id: 'DUPLICATE-SKU' }]);

    await expect(migrateProductVariants()).rejects.toThrow(/duplicate SKUs exist: DUPLICATE-SKU/);
    expect(Product.updateMany).not.toHaveBeenCalled();
    expect(Product.collection.createIndex).not.toHaveBeenCalled();
  });
});
