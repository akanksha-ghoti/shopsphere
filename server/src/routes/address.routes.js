const express = require('express');

const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createAddressSchema, updateAddressSchema } = require('../validators/address.validator');
const {
  createAddress,
  deleteAddress,
  getAddresses,
  makeDefaultAddress,
  updateAddress,
} = require('../controllers/address.controller');

const router = express.Router();

router.use(auth);

router.get('/', getAddresses);
router.post('/', validate(createAddressSchema), createAddress);
router.patch('/:id', validate(updateAddressSchema), updateAddress);
router.patch(
  '/:id/default',
  validate(updateAddressSchema.pick({ params: true })),
  makeDefaultAddress,
);
router.delete('/:id', validate(updateAddressSchema.pick({ params: true })), deleteAddress);

module.exports = router;
