const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Category = require('../src/models/Category');
const Product = require('../src/models/Product');
const Cart = require('../src/models/Cart');
const Order = require('../src/models/Order');
const Payment = require('../src/models/Payment');

const seed = async () => {
  try {
    await connectDB();

    // Reuse existing records so the script is safe to run again.
    const user = await User.findOneAndUpdate(
      { email: 'seed.customer@shopsphere.example' },
      {
        $set: {
          name: 'Seed Customer',
          role: 'customer',
          isActive: true,
        },
        $setOnInsert: {
          password: 'SeedPassword123!',
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    const category = await Category.findOneAndUpdate(
      { slug: 'seed-electronics' },
      {
        $set: { name: 'Seed Electronics', isActive: true },
        $setOnInsert: { description: 'Sample category for development' },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    const product = await Product.findOneAndUpdate(
      { slug: 'seed-wireless-mouse' },
      {
        $set: {
          name: 'Seed Wireless Mouse',
          description: 'Sample product for development',
          price: 799,
          stock: 25,
          category: category._id,
          images: [],
          isActive: true,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    const cart = await Cart.findOneAndUpdate(
      { user: user._id },
      { $set: { items: [{ product: product._id, quantity: 1 }] } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    let order = await Order.findOne({
      user: user._id,
      'items.name': 'Seed Wireless Mouse',
    });

    if (!order) {
      order = await Order.create({
        user: user._id,
        items: [{
          product: product._id,
          name: product.name,
          price: product.price,
          quantity: 1,
        }],
        totalAmount: product.price,
        status: 'pending',
      });
    }

    await Payment.findOneAndUpdate(
      { order: order._id },
      {
        $set: {
          method: 'cod',
          amount: order.totalAmount,
          status: 'pending',
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    console.log('Seed completed successfully.');
    console.log({
      userId: user._id.toString(),
      categoryId: category._id.toString(),
      productId: product._id.toString(),
      cartId: cart._id.toString(),
      orderId: order._id.toString(),
    });
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seed();