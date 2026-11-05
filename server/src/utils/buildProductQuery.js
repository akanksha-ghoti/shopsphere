function buildStockFilter(inStock) {
  const productsWithVariants = { 'variants.0': { $exists: true } };
  const productsWithoutVariants = {
    $or: [{ variants: { $exists: false } }, { variants: { $size: 0 } }],
  };

  if (inStock) {
    return {
      $or: [
        {
          ...productsWithVariants,
          variants: { $elemMatch: { stock: { $gt: 0 } } },
        },
        {
          ...productsWithoutVariants,
          stock: { $gt: 0 },
        },
      ],
    };
  }

  return {
    $or: [
      {
        ...productsWithVariants,
        variants: { $not: { $elemMatch: { stock: { $gt: 0 } } } },
      },
      {
        $and: [
          productsWithoutVariants,
          { $or: [{ stock: { $exists: false } }, { stock: { $lte: 0 } }] },
        ],
      },
    ],
  };
}

function buildProductQuery({ q, search, category, minPrice, maxPrice, inStock } = {}) {
  const filter = {};
  const text = q || search;

  if (text) {
    filter.$text = { $search: text };
  }

  if (category) {
    filter.category = category;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};

    if (minPrice !== undefined) {
      filter.price.$gte = minPrice;
    }

    if (maxPrice !== undefined) {
      filter.price.$lte = maxPrice;
    }
  }

  if (inStock !== undefined) {
    Object.assign(filter, buildStockFilter(inStock));
  }

  return filter;
}

function buildProductSort(sort = 'newest') {
  const sortOptions = {
    price_asc: { price: 1, _id: 1 },
    price_desc: { price: -1, _id: -1 },
    newest: { createdAt: -1, _id: -1 },
    oldest: { createdAt: 1, _id: 1 },
    name_asc: { name: 1, _id: 1 },
    name_desc: { name: -1, _id: -1 },
  };

  return sortOptions[sort] || sortOptions.newest;
}

module.exports = {
  buildProductQuery,
  buildProductSort,
};
