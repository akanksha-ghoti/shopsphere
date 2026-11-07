const Address = require('../models/Address');
const User = require('../models/User');
const { successResponse } = require('../utils/apiResponse');

function createError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function getAuthenticatedUserId(req) {
  const email = req.user?.email;
  if (typeof email !== 'string' || !email.trim()) {
    throw createError(401, 'Verified account email is required to access addresses');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw createError(404, 'User profile not found. Sync your profile first.');
  }

  return user._id;
}

function handleDuplicateDefault(error) {
  if (error.code !== 11000) {
    throw error;
  }

  throw createError(409, 'Another default address was selected concurrently');
}

async function setDefaultAddress(userId, addressId) {
  const address = await Address.findOne({ _id: addressId, user: userId });
  if (!address) {
    throw createError(404, 'Address not found');
  }

  await Address.updateMany(
    { user: userId, _id: { $ne: addressId }, isDefault: true },
    { $set: { isDefault: false } },
  );

  try {
    const updatedAddress = await Address.findOneAndUpdate(
      { _id: addressId, user: userId },
      { $set: { isDefault: true } },
      { new: true, runValidators: true },
    );
    if (!updatedAddress) {
      throw createError(404, 'Address not found');
    }
    return updatedAddress;
  } catch (error) {
    return handleDuplicateDefault(error);
  }
}

async function getAddresses(req, res, next) {
  try {
    const userId = await getAuthenticatedUserId(req);
    const addresses = await Address.find({ user: userId }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    return successResponse(res, addresses, 'Addresses retrieved successfully');
  } catch (error) {
    return next(error);
  }
}

async function createAddress(req, res, next) {
  try {
    const userId = await getAuthenticatedUserId(req);
    const address = await Address.createForUser({
      ...req.validatedData.body,
      user: userId,
    });

    return successResponse(res, address, 'Address created successfully', 201);
  } catch (error) {
    return next(error);
  }
}

async function updateAddress(req, res, next) {
  try {
    const userId = await getAuthenticatedUserId(req);
    const { id } = req.validatedData.params;
    const { isDefault, ...fields } = req.validatedData.body;
    const updates = { ...fields };

    if (isDefault !== undefined) {
      updates.isDefault = isDefault;
    }

    if (isDefault === true) {
      const current = Object.keys(fields).length
        ? await Address.findOneAndUpdate(
            { _id: id, user: userId },
            { $set: fields },
            { new: true, runValidators: true },
          )
        : await Address.findOne({ _id: id, user: userId });
      if (!current) {
        throw createError(404, 'Address not found');
      }

      const address = await setDefaultAddress(userId, id);
      return successResponse(res, address, 'Address updated successfully');
    }

    let address;
    try {
      address = await Address.findOneAndUpdate(
        { _id: id, user: userId },
        { $set: updates },
        { new: true, runValidators: true },
      );
    } catch (error) {
      return handleDuplicateDefault(error);
    }

    if (!address) {
      throw createError(404, 'Address not found');
    }

    return successResponse(res, address, 'Address updated successfully');
  } catch (error) {
    return next(error);
  }
}

async function deleteAddress(req, res, next) {
  try {
    const userId = await getAuthenticatedUserId(req);
    const { id } = req.validatedData.params;
    const address = await Address.findOneAndDelete({ _id: id, user: userId });

    if (!address) {
      throw createError(404, 'Address not found');
    }

    return successResponse(res, null, 'Address deleted successfully');
  } catch (error) {
    return next(error);
  }
}

async function makeDefaultAddress(req, res, next) {
  try {
    const userId = await getAuthenticatedUserId(req);
    const address = await setDefaultAddress(userId, req.validatedData.params.id);
    return successResponse(res, address, 'Default address updated successfully');
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createAddress,
  deleteAddress,
  getAddresses,
  makeDefaultAddress,
  updateAddress,
};
