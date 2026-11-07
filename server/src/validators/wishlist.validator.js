const { z } = require('zod');

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID');

const addWishlistProductSchema = z.object({
  body: z.object({ productId: objectIdSchema }).strict(),
});

const wishlistProductParamsSchema = z.object({
  params: z.object({ productId: objectIdSchema }),
});

const moveWishlistProductSchema = z.object({
  params: z.object({ productId: objectIdSchema }),
  body: z.object({ variantId: objectIdSchema.optional() }).strict().optional().default({}),
});

module.exports = {
  addWishlistProductSchema,
  moveWishlistProductSchema,
  wishlistProductParamsSchema,
};
