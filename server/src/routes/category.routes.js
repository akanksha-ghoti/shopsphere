const express = require('express');

const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} = require('../controllers/category.controller');

const router = express.Router();

// Public category listing.
router.get('/', getCategories);

// All write operations require verified admin authentication.
router.post('/', auth, requireRole('admin'), createCategory);
router.patch('/:id', auth, requireRole('admin'), updateCategory);
router.delete('/:id', auth, requireRole('admin'), deleteCategory);

module.exports = router;