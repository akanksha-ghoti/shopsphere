const mongoose = require('mongoose');

const checkoutItemSchema = new mongoose.Schema(
  {
    cartItemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    product: {
      id: { type: mongoose.Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
      slug: { type: String, required: true },
      images: { type: [String], default: [] },
    },
    variant: {
      id: { type: mongoose.Schema.Types.ObjectId, default: null },
      size: { type: String, default: null },
      color: { type: String, default: null },
      sku: { type: String, default: null },
    },
    quantity: { type: Number, required: true, min: 1, max: 99 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const checkoutSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    address: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Address',
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'expired', 'completed', 'cancelled'],
      default: 'open',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    snapshot: {
      address: {
        id: { type: mongoose.Schema.Types.ObjectId, required: true },
        name: { type: String, required: true },
        phone: { type: String, required: true },
        street: { type: String, required: true },
        addressLine2: { type: String, default: null },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
      },
      items: {
        type: [checkoutItemSchema],
        required: true,
      },
      subtotal: { type: Number, required: true, min: 0 },
      shippingFee: { type: Number, required: true, min: 0 },
      shipping: {
        fee: { type: Number, required: true, min: 0 },
        freeShippingThreshold: { type: Number, required: true, min: 0 },
        isFree: { type: Boolean, required: true },
      },
      tax: {
        rate: { type: Number, required: true, min: 0, max: 1 },
        amount: { type: Number, required: true, min: 0 },
      },
      grandTotal: { type: Number, required: true, min: 0 },
      currency: { type: String, required: true, enum: ['INR'] },
    },
    signature: {
      type: String,
      required: true,
      select: false,
      match: /^[a-f\d]{64}$/,
    },
  },
  { timestamps: true, minimize: false },
);

checkoutSessionSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'open' },
    name: 'one_open_checkout_session_per_user',
  },
);
checkoutSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: 'checkout_session_expiry' },
);

module.exports = mongoose.model('CheckoutSession', checkoutSessionSchema);
