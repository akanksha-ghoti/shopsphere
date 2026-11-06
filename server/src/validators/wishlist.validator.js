const { z } = require('zod');

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid product ID');

const addWishlistProductSchema = z.object({
  body: z.object({ productId: objectIdSchema }).strict(),
});

const wishlistProductParamsSchema = z.object({
  params: z.object({ productId: objectIdSchema }),
});

module.exports = {
  addWishlistProductSchema,
  wishlistProductParamsSchema,
};
