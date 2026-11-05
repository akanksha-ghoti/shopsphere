const mongoose = require('mongoose');

const Product = require('../models/Product');
const Category = require('../models/Category');

const AppError = require('../utils/AppError');
const { successResponse } = require('../utils/apiResponse');
const { buildProductQuery, buildProductSort } = require('../utils/buildProductQuery');

function forwardProductError(error, next) {
  if (error.code === 11000) {
    return next(new AppError('A product with this slug already exists', 409));
  }

  if (error.name === 'ValidationError') {
    return next(new AppError(error.message, 400));
  }

  return next(error);
}

// Generate URL-friendly slug.
function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Generate unique product slug.
async function createUniqueSlug(name, excludeId = null) {
  const baseSlug = generateSlug(name);

  if (!baseSlug) {
    throw new AppError('Product name must contain valid characters', 400);
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existingProduct = await Product.findOne(query);

    if (!existingProduct) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// Validate category existence.
async function validateCategory(categoryId) {
  if (!mongoose.isValidObjectId(categoryId)) {
    throw new AppError('Invalid category ID', 400);
  }

  const category = await Category.findById(categoryId);

  if (!category || !category.isActive) {
    throw new AppError('Category not found or inactive', 400);
  }
}

// POST /api/products
async function createProduct(req, res, next) {
  try {
    const data = req.validatedData.body;

    await validateCategory(data.category);

    const slug = await createUniqueSlug(data.name);

    const product = await Product.create({
      ...data,
      slug,
    });

    return successResponse(res, product, 'Product created successfully', 201);
  } catch (error) {
    forwardProductError(error, next);
  }
}

// GET /api/products
async function getProducts(req, res, next) {
  try {
    const { page = 1, limit = 10, sort = 'newest', ...productFilters } = req.validatedData.query;
    const filter = buildProductQuery(productFilters);

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .sort(buildProductSort(sort))
        .skip(skip)
        .limit(limit),

      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Products fetched successfully',
      data: products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    forwardProductError(error, next);
  }
}

// GET /api/products/:id
async function getProductById(req, res, next) {
  try {
    const { id } = req.validatedData.params;

    const product = await Product.findById(id).populate('category', 'name slug');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    return successResponse(res, product, 'Product fetched successfully');
  } catch (error) {
    forwardProductError(error, next);
  }
}

// PATCH /api/products/:id
async function updateProduct(req, res, next) {
  try {
    const { id } = req.validatedData.params;
    const data = req.validatedData.body;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    if (data.category) {
      await validateCategory(data.category);
    }

    if (data.name && data.name !== product.name) {
      data.slug = await createUniqueSlug(data.name, id);
    }

    Object.assign(product, data);

    await product.save();

    return successResponse(res, product, 'Product updated successfully');
  } catch (error) {
    forwardProductError(error, next);
  }
}

// DELETE /api/products/:id
async function deleteProduct(req, res, next) {
  try {
    const { id } = req.validatedData.params;

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    return successResponse(res, null, 'Product deleted successfully');
  } catch (error) {
    forwardProductError(error, next);
  }
}

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
