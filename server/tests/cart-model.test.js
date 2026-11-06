const mongoose = require('mongoose');
const Cart = require('../src/models/Cart');

describe('Cart model', () => {
  it('stores products, optional variant IDs, and bounded integer quantities', async () => {
    const cart = new Cart({
      user: new mongoose.Types.ObjectId(),
      items: [
        {
          product: new mongoose.Types.ObjectId(),
          variant: new mongoose.Types.ObjectId(),
          quantity: 2,
        },
      ],
    });

    await expect(cart.validate()).resolves.toBeUndefined();
    expect(cart.items[0].variant).toBeInstanceOf(mongoose.Types.ObjectId);
  });

  it.each([0, 1.5, 100])('rejects invalid cart quantity %s', async (quantity) => {
    const cart = new Cart({
      user: new mongoose.Types.ObjectId(),
      items: [{ product: new mongoose.Types.ObjectId(), quantity }],
    });

    await expect(cart.validate()).rejects.toMatchObject({
      name: 'ValidationError',
    });
  });

  it('enforces one cart per user with a unique user index', () => {
    const userIndex = Cart.schema.indexes().find(([keys]) => keys.user === 1);
    expect(userIndex).toBeDefined();
    expect(userIndex[1].unique).toBe(true);
  });
});
