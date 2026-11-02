const express = require('express');

const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');

const {
  createProductSchema,
  updateProductSchema,
  getProductSchema,
  listProductSchema,
} = require('../validators/product.validator');

const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} = require('../controllers/product.controller');

const router = express.Router();

// Public product listing.
router.get('/', validate(listProductSchema), getProducts);

router.get('/:id', validate(getProductSchema), getProductById);

// Admin-only operations.
router.post('/', auth, requireRole('admin'), validate(createProductSchema), createProduct);

router.patch('/:id', auth, requireRole('admin'), validate(updateProductSchema), updateProduct);

router.delete('/:id', auth, requireRole('admin'), validate(getProductSchema), deleteProduct);

module.exports = router;
