const mongoose = require('mongoose');

const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const { successResponse } = require('../utils/apiResponse');

function handleVariantError(error, next) {
  if (error.code === 11000) {
    return next(new AppError('A variant with this SKU already exists', 409));
  }

  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return next(new AppError(error.message, 400));
  }

  return next(error);
}

async function findProductAndVariant(productId, variantId) {
  const product = await Product.findById(productId);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  const variant = product.variants.id(variantId);

  if (!variant) {
    throw new AppError('Product variant not found', 404);
  }

  return { product, variant };
}

async function createVariant(req, res, next) {
  try {
    const { productId } = req.validatedData.params;
    const variantData = req.validatedData.body;

    const product = await Product.findOneAndUpdate(
      { _id: productId, 'variants.sku': { $ne: variantData.sku } },
      { $push: { variants: variantData } },
      { new: true, runValidators: true },
    );

    if (!product) {
      const existingProduct = await Product.exists({ _id: productId });

      if (!existingProduct) {
        throw new AppError('Product not found', 404);
      }

      throw new AppError('A variant with this SKU already exists', 409);
    }

    const variant = product.variants[product.variants.length - 1];

    return successResponse(res, variant, 'Product variant created successfully', 201);
  } catch (error) {
    return handleVariantError(error, next);
  }
}

async function updateVariant(req, res, next) {
  try {
    const { productId, variantId } = req.validatedData.params;
    const updates = req.validatedData.body;
    const updateFields = {};

    for (const [field, value] of Object.entries(updates)) {
      updateFields[`variants.$[variant].${field}`] = value;
    }

    const filter = {
      _id: productId,
      'variants._id': variantId,
    };

    if (updates.sku) {
      filter.variants = {
        $not: {
          $elemMatch: {
            sku: updates.sku,
            _id: { $ne: new mongoose.Types.ObjectId(variantId) },
          },
        },
      };
    }

    const product = await Product.findOneAndUpdate(
      filter,
      { $set: updateFields },
      {
        new: true,
        runValidators: true,
        arrayFilters: [{ 'variant._id': variantId }],
      },
    );

    if (!product) {
      const { product: existingProduct } = await findProductAndVariant(productId, variantId);

      if (updates.sku) {
        const duplicate = existingProduct.variants.some(
          (variant) => variant._id.toString() !== variantId && variant.sku === updates.sku,
        );

        if (duplicate) {
          throw new AppError('A variant with this SKU already exists', 409);
        }
      }

      throw new AppError('Product variant could not be updated', 409);
    }

    const variant = product.variants.id(variantId);

    return successResponse(res, variant, 'Product variant updated successfully');
  } catch (error) {
    return handleVariantError(error, next);
  }
}

async function deleteVariant(req, res, next) {
  try {
    const { productId, variantId } = req.validatedData.params;

    const product = await Product.findOneAndUpdate(
      { _id: productId, 'variants._id': variantId },
      { $pull: { variants: { _id: variantId } } },
      { new: true },
    );

    if (!product) {
      await findProductAndVariant(productId, variantId);
      throw new AppError('Product variant could not be deleted', 409);
    }

    return successResponse(res, null, 'Product variant deleted successfully');
  } catch (error) {
    return handleVariantError(error, next);
  }
}

module.exports = {
  createVariant,
  updateVariant,
  deleteVariant,
};
