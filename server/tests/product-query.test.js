const { productQuerySchema } = require('../src/validators/productQuery.validator');
const { buildProductQuery, buildProductSort } = require('../src/utils/buildProductQuery');

const categoryId = '0123456789abcdef01234567';

describe('Product query validation', () => {
  it('accepts supported search, filter, sort, and pagination parameters', () => {
    const result = productQuerySchema.safeParse({
      q: 'phone',
      category: categoryId,
      minPrice: '10.5',
      maxPrice: '100',
      inStock: 'true',
      sort: 'price_asc',
      page: '2',
      limit: '20',
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      q: 'phone',
      category: categoryId,
      minPrice: 10.5,
      maxPrice: 100,
      inStock: true,
      sort: 'price_asc',
      page: 2,
      limit: 20,
    });
  });

  it.each([
    [{ category: 'bad-id' }],
    [{ minPrice: '' }],
    [{ minPrice: 'NaN' }],
    [{ maxPrice: 'Infinity' }],
    [{ minPrice: '-1' }],
    [{ minPrice: '20', maxPrice: '10' }],
    [{ inStock: 'yes' }],
    [{ sort: 'random' }],
    [{ page: '0' }],
    [{ limit: '101' }],
    [{ q: 'phone', search: 'phone' }],
    [{ extra: 'unexpected' }],
    [{ category: [categoryId, categoryId] }],
  ])('rejects invalid or ambiguous query values: %o', (query) => {
    expect(productQuerySchema.safeParse(query).success).toBe(false);
  });

  it('retains the previous search query parameter', () => {
    expect(productQuerySchema.parse({ search: 'wireless mouse' })).toEqual({
      search: 'wireless mouse',
    });
  });
});

describe('Product query builder', () => {
  it('combines text, category, price range, and in-stock constraints', () => {
    expect(
      buildProductQuery({
        q: 'phone',
        category: categoryId,
        minPrice: 100,
        maxPrice: 500,
        inStock: true,
      }),
    ).toEqual({
      $text: { $search: 'phone' },
      category: categoryId,
      price: { $gte: 100, $lte: 500 },
      $or: [
        {
          'variants.0': { $exists: true },
          variants: { $elemMatch: { stock: { $gt: 0 } } },
        },
        {
          $or: [{ variants: { $exists: false } }, { variants: { $size: 0 } }],
          stock: { $gt: 0 },
        },
      ],
    });
  });

  it('supports minimum-only and maximum-only price filters', () => {
    expect(buildProductQuery({ minPrice: 25 }).price).toEqual({ $gte: 25 });
    expect(buildProductQuery({ maxPrice: 75 }).price).toEqual({ $lte: 75 });
  });

  it('uses product stock when variants are absent and variant stock otherwise', () => {
    const filter = buildProductQuery({ inStock: false });

    expect(filter.$or[0].variants.$not.$elemMatch.stock).toEqual({ $gt: 0 });
    expect(filter.$or[0]['variants.0']).toEqual({ $exists: true });
    expect(filter.$or[1].$and[0].$or).toEqual([
      { variants: { $exists: false } },
      { variants: { $size: 0 } },
    ]);
    expect(filter.$or[1].$and[1].$or).toEqual([
      { stock: { $exists: false } },
      { stock: { $lte: 0 } },
    ]);
  });

  it.each([
    ['price_asc', { price: 1, _id: 1 }],
    ['price_desc', { price: -1, _id: -1 }],
    ['newest', { createdAt: -1, _id: -1 }],
    ['oldest', { createdAt: 1, _id: 1 }],
    ['name_asc', { name: 1, _id: 1 }],
    ['name_desc', { name: -1, _id: -1 }],
  ])('sorts %s deterministically', (option, expectedSort) => {
    expect(buildProductSort(option)).toEqual(expectedSort);
  });

  it('defaults to newest first', () => {
    expect(buildProductSort()).toEqual({ createdAt: -1, _id: -1 });
  });
});
