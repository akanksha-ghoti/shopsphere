jest.mock('../src/config/firebaseAdmin', () => ({
  verifyIdToken: jest.fn(),
}));

jest.mock('../src/models/User', () => ({
  findOne: jest.fn(),
}));

jest.mock('../src/models/Address', () => ({
  createForUser: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndDelete: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateMany: jest.fn(),
}));

const request = require('supertest');
const app = require('../src/app');
const Address = require('../src/models/Address');
const User = require('../src/models/User');
const { verifyIdToken } = require('../src/config/firebaseAdmin');

const userId = '0123456789abcdef01234567';
const otherUserId = '1123456789abcdef01234567';
const addressId = 'abcdef0123456789abcdef01';
const otherAddressId = 'abcdef0123456789abcdef02';
const addressBody = {
  name: 'Akanksha Ghoti',
  phone: '9876543210',
  street: '12 Market Road',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
};
const savedAddress = { _id: addressId, user: userId, ...addressBody };

describe('Address API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyIdToken.mockImplementation(async (token) => ({
      uid: token,
      email: token === 'other-address-user' ? 'other@example.com' : 'user@example.com',
    }));
    User.findOne.mockImplementation(async ({ email }) => ({
      _id: email === 'other@example.com' ? otherUserId : userId,
    }));
    Address.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([savedAddress]),
    });
    Address.createForUser.mockResolvedValue(savedAddress);
    Address.findOne.mockResolvedValue(savedAddress);
    Address.findOneAndUpdate.mockResolvedValue(savedAddress);
    Address.findOneAndDelete.mockResolvedValue(savedAddress);
    Address.updateMany.mockResolvedValue({ modifiedCount: 1 });
  });

  it('requires authentication for every address endpoint', async () => {
    const responses = await Promise.all([
      request(app).get('/api/addresses'),
      request(app).post('/api/addresses').send(addressBody),
      request(app).patch(`/api/addresses/${addressId}`).send({ city: 'Mumbai' }),
      request(app).delete(`/api/addresses/${addressId}`),
      request(app).patch(`/api/addresses/${addressId}/default`),
    ]);

    expect(responses.map((response) => response.status)).toEqual([401, 401, 401, 401, 401]);
    expect(Address.find).not.toHaveBeenCalled();
    expect(Address.createForUser).not.toHaveBeenCalled();
  });

  it('lists only addresses belonging to the authenticated user', async () => {
    const response = await request(app)
      .get('/api/addresses')
      .set('Authorization', 'Bearer address-test-user');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, data: [savedAddress] });
    expect(Address.find).toHaveBeenCalledWith({ user: userId });
  });

  it('creates an address using the token-derived user ID', async () => {
    const response = await request(app)
      .post('/api/addresses')
      .set('Authorization', 'Bearer address-test-user')
      .send(addressBody);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ success: true, data: savedAddress });
    expect(Address.createForUser).toHaveBeenCalledWith({
      ...addressBody,
      user: userId,
    });
  });

  it('rejects invalid addresses and client-supplied ownership fields', async () => {
    const [invalidPincode, invalidPhone, suppliedUser] = await Promise.all([
      request(app)
        .post('/api/addresses')
        .set('Authorization', 'Bearer address-test-user')
        .send({ ...addressBody, pincode: '123' }),
      request(app)
        .post('/api/addresses')
        .set('Authorization', 'Bearer address-test-user')
        .send({ ...addressBody, phone: '123' }),
      request(app)
        .post('/api/addresses')
        .set('Authorization', 'Bearer address-test-user')
        .send({ ...addressBody, user: otherUserId }),
    ]);

    expect([invalidPincode.status, invalidPhone.status, suppliedUser.status]).toEqual([
      400, 400, 400,
    ]);
    expect(Address.createForUser).not.toHaveBeenCalled();
  });

  it('enforces the model address limit and default-address conflicts', async () => {
    Address.createForUser.mockRejectedValueOnce(
      Object.assign(new Error('A user can save at most 10 addresses'), {
        statusCode: 409,
        code: 'ADDRESS_LIMIT_REACHED',
      }),
    );
    const limitResponse = await request(app)
      .post('/api/addresses')
      .set('Authorization', 'Bearer address-test-user')
      .send(addressBody);

    Address.createForUser.mockRejectedValueOnce(
      Object.assign(new Error('This user already has a default address'), {
        statusCode: 409,
        code: 'DEFAULT_ADDRESS_EXISTS',
      }),
    );
    const defaultResponse = await request(app)
      .post('/api/addresses')
      .set('Authorization', 'Bearer address-test-user')
      .send({ ...addressBody, isDefault: true });

    expect(limitResponse.status).toBe(409);
    expect(defaultResponse.status).toBe(409);
  });

  it('updates only an address owned by the authenticated user', async () => {
    const response = await request(app)
      .patch(`/api/addresses/${addressId}`)
      .set('Authorization', 'Bearer address-test-user')
      .send({ city: 'Mumbai' });

    expect(response.status).toBe(200);
    expect(Address.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: addressId, user: userId },
      { $set: { city: 'Mumbai' } },
      { new: true, runValidators: true },
    );
  });

  it('returns not found when updating another user address', async () => {
    Address.findOneAndUpdate.mockResolvedValueOnce(null);

    const response = await request(app)
      .patch(`/api/addresses/${otherAddressId}`)
      .set('Authorization', 'Bearer address-test-user')
      .send({ city: 'Mumbai' });

    expect(response.status).toBe(404);
    expect(Address.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: otherAddressId, user: userId },
      { $set: { city: 'Mumbai' } },
      { new: true, runValidators: true },
    );
  });

  it('rejects invalid IDs and empty updates', async () => {
    const [invalidId, emptyUpdate] = await Promise.all([
      request(app)
        .patch('/api/addresses/not-an-id')
        .set('Authorization', 'Bearer address-test-user')
        .send({ city: 'Mumbai' }),
      request(app)
        .patch(`/api/addresses/${addressId}`)
        .set('Authorization', 'Bearer address-test-user')
        .send({}),
    ]);

    expect([invalidId.status, emptyUpdate.status]).toEqual([400, 400]);
    expect(Address.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('sets the default address after clearing the previous default for this user', async () => {
    const response = await request(app)
      .patch(`/api/addresses/${addressId}/default`)
      .set('Authorization', 'Bearer address-test-user');

    expect(response.status).toBe(200);
    expect(Address.findOne).toHaveBeenCalledWith({
      _id: addressId,
      user: userId,
    });
    expect(Address.updateMany).toHaveBeenCalledWith(
      { user: userId, _id: { $ne: addressId }, isDefault: true },
      { $set: { isDefault: false } },
    );
    expect(Address.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: addressId, user: userId },
      { $set: { isDefault: true } },
      { new: true, runValidators: true },
    );
  });

  it('does not set an address owned by another user as default', async () => {
    Address.findOne.mockResolvedValueOnce(null);

    const response = await request(app)
      .patch(`/api/addresses/${otherAddressId}/default`)
      .set('Authorization', 'Bearer address-test-user');

    expect(response.status).toBe(404);
    expect(Address.updateMany).not.toHaveBeenCalled();
    expect(Address.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns a conflict if concurrent requests attempt to select different defaults', async () => {
    Address.findOneAndUpdate.mockRejectedValueOnce(
      Object.assign(new Error('duplicate default'), { code: 11000 }),
    );

    const response = await request(app)
      .patch(`/api/addresses/${addressId}/default`)
      .set('Authorization', 'Bearer address-test-user');

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/concurrently/i);
  });

  it('deletes only an address owned by the authenticated user', async () => {
    const response = await request(app)
      .delete(`/api/addresses/${addressId}`)
      .set('Authorization', 'Bearer address-test-user');

    expect(response.status).toBe(200);
    expect(Address.findOneAndDelete).toHaveBeenCalledWith({
      _id: addressId,
      user: userId,
    });
  });

  it('does not reveal another user address during deletion', async () => {
    Address.findOneAndDelete.mockResolvedValueOnce(null);

    const response = await request(app)
      .delete(`/api/addresses/${otherAddressId}`)
      .set('Authorization', 'Bearer address-test-user');

    expect(response.status).toBe(404);
    expect(Address.findOneAndDelete).toHaveBeenCalledWith({
      _id: otherAddressId,
      user: userId,
    });
  });
});
