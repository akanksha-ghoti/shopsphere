const { verifyIdToken } = require('../config/firebaseAdmin');

async function auth(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token is required',
    });
  }

  const idToken = authorization.slice(7).trim();

  if (!idToken) {
    return res.status(401).json({
      success: false,
      message: 'Authentication token is required',
    });
  }

  try {
    const decodedToken = await verifyIdToken(idToken);

    // Only Firebase-verified custom claims determine the role.
    const role =
      decodedToken.admin === true || decodedToken.role === 'admin'
        ? 'admin'
        : 'customer';

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role,
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token',
    });
  }
}

module.exports = auth;