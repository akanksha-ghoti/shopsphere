const { z } = require('zod');

const addressBodySchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    phone: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
    street: z.string().trim().min(1).max(200),
    addressLine2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    pincode: z
      .string()
      .trim()
      .regex(/^[1-9]\d{5}$/, 'Enter a valid 6-digit Indian PIN code'),
    isDefault: z.boolean().optional(),
  })
  .strict();

const createAddressSchema = z.object({
  body: addressBodySchema,
});

const updateAddressSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid address ID'),
  }),
  body: addressBodySchema
    .partial()
    .refine((data) => Object.keys(data).length > 0, 'At least one field is required'),
});

module.exports = {
  createAddressSchema,
  updateAddressSchema,
};
