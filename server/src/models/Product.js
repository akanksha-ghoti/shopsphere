const mongoose = require('mongoose');

const SKU_PATTERN = /^[A-Z0-9][A-Z0-9._-]{2,63}$/;

const variantSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    color: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      match: [
        SKU_PATTERN,
        'SKU must be 3-64 uppercase letters, digits, dots, underscores, or hyphens',
      ],
    },
    price: {
      type: Number,
      min: 0,
      validate: {
        validator: Number.isFinite,
        message: 'Variant price must be a finite number',
      },
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Variant stock must be an integer',
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

variantSchema.virtual('effectivePrice').get(function getEffectivePrice() {
  return this.price ?? this.parent()?.price;
});

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Stock must be an integer',
      },
    },
    images: {
      type: [String],
      default: [],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    variants: {
      type: [variantSchema],
      default: [],
      validate: {
        validator(variants) {
          const skus = variants.map((variant) => variant.sku?.toUpperCase());
          return new Set(skus).size === skus.length;
        },
        message: 'Variant SKUs must be unique within a product',
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_document, product) {
        for (const variant of product.variants || []) {
          variant.effectivePrice = variant.price ?? product.price;
        }

        return product;
      },
    },
  },
);

// Search products by name or description.
productSchema.index({ name: 'text', description: 'text' });
productSchema.index(
  { 'variants.sku': 1 },
  {
    unique: true,
    partialFilterExpression: { 'variants.sku': { $type: 'string' } },
    name: 'variants_sku_unique',
  },
);
productSchema.index({ category: 1, price: 1, _id: 1 }, { name: 'category_price_id' });
productSchema.index({ price: 1, _id: 1 }, { name: 'price_id' });
productSchema.index({ category: 1, createdAt: -1, _id: -1 }, { name: 'category_createdAt_id' });
productSchema.index({ createdAt: -1, _id: -1 }, { name: 'createdAt_id' });
productSchema.index({ name: 1, _id: 1 }, { name: 'name_id' });
productSchema.index({ stock: 1 }, { name: 'stock' });
productSchema.index({ 'variants.stock': 1 }, { name: 'variants_stock' });

module.exports = mongoose.model('Product', productSchema);
