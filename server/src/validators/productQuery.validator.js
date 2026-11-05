const { z } = require('zod');

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID');
const priceSchema = z
  .string()
  .regex(/^(?:\d+(?:\.\d*)?|\.\d+)$/, 'Must be a valid non-negative number')
  .transform(Number)
  .pipe(z.number().finite().min(0));
const positiveIntegerSchema = (maximum) =>
  z
    .string()
    .regex(/^[1-9]\d*$/, 'Must be a positive integer')
    .transform(Number)
    .pipe(z.number().int().min(1).max(maximum));
const searchSchema = z.string().trim().min(1).max(200);

const productQuerySchema = z
  .object({
    q: searchSchema.optional(),
    search: searchSchema.optional(),
    category: objectIdSchema.optional(),
    minPrice: priceSchema.optional(),
    maxPrice: priceSchema.optional(),
    inStock: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    sort: z
      .enum(['price_asc', 'price_desc', 'newest', 'oldest', 'name_asc', 'name_desc'])
      .optional(),
    page: positiveIntegerSchema(Number.MAX_SAFE_INTEGER).optional(),
    limit: positiveIntegerSchema(100).optional(),
  })
  .strict()
  .refine(
    ({ minPrice, maxPrice }) =>
      minPrice === undefined || maxPrice === undefined || minPrice <= maxPrice,
    {
      message: 'minPrice must be less than or equal to maxPrice',
      path: ['minPrice'],
    },
  )
  .refine(({ q, search }) => !(q && search), {
    message: 'Use either q or search, not both',
    path: ['q'],
  });

const listProductSchema = z.object({
  query: productQuerySchema,
});

module.exports = {
  productQuerySchema,
  listProductSchema,
};
