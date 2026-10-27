const { verifyIdToken } = require('../config/firebaseAdmin');

async function auth(req, res, next) {
const authorization = req.headers.authorization;

// Reject requests without a Bearer token.
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
// Verify the token with Firebase Admin.
const decodedToken = await verifyIdToken(idToken);

// Trust identity only from the verified token.
// Never trust a role supplied by the client.
req.user = {
  uid: decodedToken.uid,
  role: 'user',
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