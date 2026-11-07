const { createAddressSchema, updateAddressSchema } = require('../src/validators/address.validator');

const validAddress = {
  name: 'Akanksha Ghoti',
  phone: '9876543210',
  street: '12 Market Road',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
};

describe('Address validators', () => {
  it('accepts a valid Indian address', () => {
    expect(createAddressSchema.safeParse({ body: validAddress }).success).toBe(true);
  });

  it.each([
    ['phone number', { phone: '987654321' }],
    ['phone prefix', { phone: '1234567890' }],
    ['PIN code length', { pincode: '41100' }],
    ['zero-prefixed PIN code', { pincode: '011001' }],
  ])('rejects invalid %s', (_label, fields) => {
    expect(createAddressSchema.safeParse({ body: { ...validAddress, ...fields } }).success).toBe(
      false,
    );
  });

  it('requires at least one valid field when updating an address', () => {
    const id = '0123456789abcdef01234567';

    expect(
      updateAddressSchema.safeParse({
        params: { id },
        body: { city: 'Mumbai' },
      }).success,
    ).toBe(true);
    expect(updateAddressSchema.safeParse({ params: { id }, body: {} }).success).toBe(false);
  });

  it('does not allow callers to set ownership fields', () => {
    expect(
      createAddressSchema.safeParse({
        body: { ...validAddress, user: '0123456789abcdef01234567' },
      }).success,
    ).toBe(false);
  });
});
