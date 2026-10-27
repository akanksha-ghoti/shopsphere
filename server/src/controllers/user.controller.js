const User = require('../models/User');

// Create or update the user using verified Firebase identity.
async function syncUser(req, res, next) {
  try {
    const { uid } = req.user;
    const { email, name, photoURL } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email and name are required',
      });
    }

    let user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: `firebase:${uid}`,
        role: 'customer',
      });
    } else {
      user.name = name.trim();
      await user.save();
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        photoURL: photoURL || null,
      },
    });
  } catch (error) {
    return next(error);
  }
}

// Return the current user's profile.
async function getMe(req, res, next) {
  try {
    const user = await User.findOne({
      email: req.user.email,
    }).select('-password -__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found. Sync your profile first.',
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return next(error);
  }
}

// Update only permitted profile fields. Role and email cannot be changed.
async function updateMe(req, res, next) {
  try {
    const updates = {};

    if (typeof req.body.name === 'string') {
      updates.name = req.body.name.trim();
    }

    const user = await User.findOneAndUpdate(
      { email: req.user.email },
      { $set: updates },
      { new: true, runValidators: true },
    ).select('-password -__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  syncUser,
  getMe,
  updateMe,
};