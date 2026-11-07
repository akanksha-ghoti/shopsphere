const mongoose = require('mongoose');

const MAX_ADDRESSES_PER_USER = 10;

function createAddressError(code, message) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = 409;
  return error;
}

const addressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    slot: {
      type: Number,
      required: true,
      min: 0,
      max: MAX_ADDRESSES_PER_USER - 1,
      validate: {
        validator: Number.isInteger,
        message: 'Address slot must be an integer',
      },
      select: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Phone number must be a valid 10-digit Indian mobile number'],
    },
    street: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    addressLine2: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    state: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
      match: [/^[1-9]\d{5}$/, 'PIN code must be a valid 6-digit Indian PIN code'],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

addressSchema.index({ user: 1, slot: 1 }, { unique: true, name: 'address_user_slot_unique' });
addressSchema.index(
  { user: 1, isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true },
    name: 'address_one_default_per_user',
  },
);

addressSchema.statics.createForUser = async function createForUser(address) {
  for (let slot = 0; slot < MAX_ADDRESSES_PER_USER; slot += 1) {
    try {
      return await this.create({ ...address, slot });
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }

      const defaultIndexConflict =
        error.keyPattern?.isDefault === 1 ||
        error.keyValue?.isDefault === true ||
        (address.isDefault === true &&
          (await this.exists({ user: address.user, isDefault: true })));

      if (defaultIndexConflict) {
        throw createAddressError(
          'DEFAULT_ADDRESS_EXISTS',
          'This user already has a default address',
        );
      }
    }
  }

  throw createAddressError(
    'ADDRESS_LIMIT_REACHED',
    `A user can save at most ${MAX_ADDRESSES_PER_USER} addresses`,
  );
};

addressSchema.statics.MAX_ADDRESSES_PER_USER = MAX_ADDRESSES_PER_USER;

module.exports = mongoose.model('Address', addressSchema);
