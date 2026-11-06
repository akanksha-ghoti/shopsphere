const { z } = require('zod');

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId');
const quantitySchema = z.number().int().min(1).max(99);

const addCartItemSchema = z.object({
  body: z
    .object({
      productId: objectIdSchema,
      variantId: objectIdSchema.optional(),
      quantity: quantitySchema,
    })
    .strict(),
});

const updateCartItemSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({ quantity: quantitySchema }).strict(),
});

const cartItemParamsSchema = z.object({
  params: z.object({ id: objectIdSchema }),
});

const cartSchema = z.object({});

module.exports = {
  addCartItemSchema,
  cartItemParamsSchema,
  cartSchema,
  updateCartItemSchema,
};
