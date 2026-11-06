const express = require('express');

const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  addCartItemSchema,
  cartItemParamsSchema,
  cartSchema,
  updateCartItemSchema,
} = require('../validators/cart.validator');
const {
  addItem,
  clearCart,
  getCart,
  removeItem,
  updateItem,
} = require('../controllers/cart.controller');

const router = express.Router();

router.use(auth);

router.get('/', validate(cartSchema), getCart);
router.post('/items', validate(addCartItemSchema), addItem);
router.patch('/items/:id', validate(updateCartItemSchema), updateItem);
router.delete('/items/:id', validate(cartItemParamsSchema), removeItem);
router.delete('/', validate(cartSchema), clearCart);

module.exports = router;
