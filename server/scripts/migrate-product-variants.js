const mongoose = require('mongoose');

mongoose.set('autoIndex', false);

const connectDB = require('../src/config/db');
const Product = require('../src/models/Product');

async function migrateProductVariants(productModel = Product) {
  const duplicateSkus = await productModel.aggregate([
    { $unwind: '$variants' },
    {
      $group: {
        _id: { $toUpper: '$variants.sku' },
        productIds: { $addToSet: '$_id' },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $limit: 10 },
  ]);

  if (duplicateSkus.length > 0) {
    const skus = duplicateSkus.map(({ _id }) => _id).join(', ');
    throw new Error(`Cannot create the global variant SKU index; duplicate SKUs exist: ${skus}`);
  }

  const result = await productModel.updateMany(
    {
      $or: [{ variants: { $exists: false } }, { variants: null }],
    },
    { $set: { variants: [] } },
  );

  await productModel.collection.createIndex(
    { 'variants.sku': 1 },
    {
      unique: true,
      partialFilterExpression: { 'variants.sku': { $type: 'string' } },
      name: 'variants_sku_unique',
    },
  );

  return result.modifiedCount;
}

if (require.main === module) {
  connectDB()
    .then(() => migrateProductVariants())
    .then((modifiedCount) => {
      console.log(`Product variant migration complete (${modifiedCount} products updated).`);
    })
    .catch((error) => {
      console.error('Product variant migration failed:', error.message);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}

module.exports = migrateProductVariants;
