const express = require('express');

const auth = require('../middleware/auth');
const {
  syncUser,
  getMe,
  updateMe,
} = require('../controllers/user.controller');

const router = express.Router();

// All user profile endpoints require a verified Firebase token.
router.use(auth);

router.post('/sync', syncUser);
router.get('/me', getMe);
router.patch('/me', updateMe);

module.exports = router;