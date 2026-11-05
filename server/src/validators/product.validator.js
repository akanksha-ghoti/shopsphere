const { z } = require('zod');
const { listProductSchema } = require('./productQuery.validator');

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID');

const productBodySchema = z.object({
  name: z.string().trim().min(2, 'Product name must be at least 2 characters'),

  description: z.string().trim().min(5, 'Description must be at least 5 characters'),

  price: z.number().finite().min(0, 'Price cannot be negative'),

  stock: z.number().int().min(0, 'Stock cannot be negative'),

  category: objectIdSchema,

  images: z.array(z.string().url()).optional(),

  isActive: z.boolean().optional(),
});

const createProductSchema = z.object({
  body: productBodySchema,
});

const updateProductSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: productBodySchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, 'At least one field is required'),
});

const getProductSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  getProductSchema,
  listProductSchema,
};
