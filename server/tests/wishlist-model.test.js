const mongoose = require('mongoose');
const Wishlist = require('../src/models/Wishlist');

describe('Wishlist model', () => {
  it('requires a user and product reference', async () => {
    const wishlist = new Wishlist({});

    await expect(wishlist.validate()).rejects.toMatchObject({
      name: 'ValidationError',
      errors: {
        user: expect.anything(),
        product: expect.anything(),
      },
    });
  });

  it('stores valid user and product ObjectId references', async () => {
    const user = new mongoose.Types.ObjectId();
    const product = new mongoose.Types.ObjectId();
    const wishlist = new Wishlist({ user, product });

    await expect(wishlist.validate()).resolves.toBeUndefined();
    expect(wishlist.user).toEqual(user);
    expect(wishlist.product).toEqual(product);
  });

  it('defines a unique compound index for each user-product pair', () => {
    const pairIndex = Wishlist.schema
      .indexes()
      .find(([keys]) => keys.user === 1 && keys.product === 1);

    expect(pairIndex).toBeDefined();
    expect(pairIndex[1]).toMatchObject({
      unique: true,
      name: 'wishlist_user_product_unique',
    });
  });
});
