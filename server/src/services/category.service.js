const Category = require('../models/Category');
const Product = require('../models/Product');

// Generate a URL-friendly slug.
function generateSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Generate a unique slug.
async function createUniqueSlug(name, excludeId = null) {
  const baseSlug = generateSlug(name);

  if (!baseSlug) {
    throw new Error('Category name must contain valid characters');
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existingCategory = await Category.findOne(query);

    if (!existingCategory) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// Create category.
async function createCategory(data) {
  const slug = await createUniqueSlug(data.name);

  return Category.create({
    name: data.name,
    slug,
    description: data.description || '',
    isActive: data.isActive ?? true,
  });
}

// Get paginated categories.
async function getCategories({ page = 1, limit = 10, search = '' }) {
  const filter = {};

  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }

  const skip = (page - 1) * limit;

  const [categories, total] = await Promise.all([
    Category.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Category.countDocuments(filter),
  ]);

  return {
    categories,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// Update category.
async function updateCategory(id, data) {
  const updates = {};

  if (data.name !== undefined) {
    updates.name = data.name;
    updates.slug = await createUniqueSlug(data.name, id);
  }

  if (data.description !== undefined) {
    updates.description = data.description;
  }

  if (data.isActive !== undefined) {
    updates.isActive = data.isActive;
  }

  return Category.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  });
}

// Delete category only when no products reference it.
async function deleteCategory(id) {
  const category = await Category.findById(id);

  if (!category) {
    return null;
  }

  const productCount = await Product.countDocuments({
    category: id,
  });

  if (productCount > 0) {
    const error = new Error(
      'Cannot delete category because products are linked to it',
    );
    error.statusCode = 409;
    throw error;
  }

  await Category.findByIdAndDelete(id);

  return category;
}

module.exports = {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
};