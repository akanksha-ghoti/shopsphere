const { z } = require('zod');

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId');
const skuSchema = z
  .string()
  .trim()
  .min(3)
  .max(64)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/, 'SKU contains invalid characters')
  .transform((sku) => sku.toUpperCase());

const variantBodySchema = z.object({
  size: z.string().trim().min(1).max(40),
  color: z.string().trim().min(1).max(40),
  sku: skuSchema,
  price: z.number().finite().min(0).optional(),
  stock: z.number().int().min(0),
});

const createVariantSchema = z.object({
  params: z.object({
    productId: objectIdSchema,
  }),
  body: variantBodySchema,
});

const updateVariantSchema = z.object({
  params: z.object({
    productId: objectIdSchema,
    variantId: objectIdSchema,
  }),
  body: variantBodySchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, 'At least one variant field is required'),
});

const variantParamsSchema = z.object({
  params: z.object({
    productId: objectIdSchema,
    variantId: objectIdSchema,
  }),
});

module.exports = {
  createVariantSchema,
  updateVariantSchema,
  variantParamsSchema,
};
