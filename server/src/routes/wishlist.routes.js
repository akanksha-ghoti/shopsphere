const express = require('express');

const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  addWishlistProductSchema,
  wishlistProductParamsSchema,
} = require('../validators/wishlist.validator');
const {
  addToWishlist,
  getWishlist,
  moveToCart,
  removeFromWishlist,
} = require('../controllers/wishlist.controller');

const router = express.Router();

router.use(auth);

router.get('/', getWishlist);
router.post('/', validate(addWishlistProductSchema), addToWishlist);
router.post('/:productId/move-to-cart', validate(wishlistProductParamsSchema), moveToCart);
router.delete('/:productId', validate(wishlistProductParamsSchema), removeFromWishlist);

module.exports = router;
