const mongoose = require('mongoose');
const Address = require('../src/models/Address');

const validAddress = {
  user: new mongoose.Types.ObjectId(),
  name: 'Akanksha Ghoti',
  phone: '9876543210',
  street: '12 Market Road',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
};

describe('Address model', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('accepts a valid address and defaults it to non-default', async () => {
    const address = new Address({ ...validAddress, slot: 0 });

    await expect(address.validate()).resolves.toBeUndefined();
    expect(address.isDefault).toBe(false);
  });

  it.each([
    ['invalid phone length', { phone: '987654321' }],
    ['non-mobile phone prefix', { phone: '1234567890' }],
    ['invalid PIN length', { pincode: '41100' }],
    ['zero-prefixed PIN', { pincode: '011001' }],
  ])('rejects %s', async (_label, fields) => {
    const address = new Address({ ...validAddress, slot: 0, ...fields });

    await expect(address.validate()).rejects.toMatchObject({
      name: 'ValidationError',
    });
  });

  it('uses unique indexes to enforce one default and bounded address slots per user', () => {
    const indexes = Address.schema.indexes();

    expect(indexes).toContainEqual([
      { user: 1, slot: 1 },
      expect.objectContaining({ unique: true }),
    ]);
    expect(indexes).toContainEqual([
      { user: 1, isDefault: 1 },
      expect.objectContaining({
        unique: true,
        partialFilterExpression: { isDefault: true },
      }),
    ]);
    expect(Address.MAX_ADDRESSES_PER_USER).toBe(10);
  });

  it('retries a colliding slot for concurrent address creation', async () => {
    const duplicateSlot = Object.assign(new Error('duplicate slot'), {
      code: 11000,
      keyPattern: { user: 1, slot: 1 },
    });
    const createdAddress = { ...validAddress, slot: 1 };
    const create = jest
      .spyOn(Address, 'create')
      .mockRejectedValueOnce(duplicateSlot)
      .mockResolvedValueOnce(createdAddress);

    await expect(Address.createForUser(validAddress)).resolves.toBe(createdAddress);
    expect(create.mock.calls.map(([address]) => address.slot)).toEqual([0, 1]);
  });

  it('rejects the address that exceeds the per-user limit', async () => {
    const duplicateSlot = Object.assign(new Error('duplicate slot'), {
      code: 11000,
      keyPattern: { user: 1, slot: 1 },
    });
    jest.spyOn(Address, 'create').mockRejectedValue(duplicateSlot);

    await expect(Address.createForUser(validAddress)).rejects.toMatchObject({
      code: 'ADDRESS_LIMIT_REACHED',
      statusCode: 409,
    });
    expect(Address.create).toHaveBeenCalledTimes(Address.MAX_ADDRESSES_PER_USER);
  });

  it('rejects concurrent attempts to create a second default address', async () => {
    const duplicateDefault = Object.assign(new Error('duplicate default'), {
      code: 11000,
      keyPattern: { user: 1, isDefault: 1 },
    });
    jest.spyOn(Address, 'create').mockRejectedValue(duplicateDefault);

    await expect(Address.createForUser({ ...validAddress, isDefault: true })).rejects.toMatchObject(
      {
        code: 'DEFAULT_ADDRESS_EXISTS',
        statusCode: 409,
      },
    );
    expect(Address.create).toHaveBeenCalledTimes(1);
  });
});
