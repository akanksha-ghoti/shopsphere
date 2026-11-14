const express = require('express');
const { z } = require('zod');

const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createCheckoutSummary } = require('../controllers/checkout.controller');

const checkoutSummarySchema = z.object({
  body: z
    .object({
      addressId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid address ID'),
    })
    .strict(),
});

const router = express.Router();

router.use(auth);
router.post('/summary', validate(checkoutSummarySchema), createCheckoutSummary);

module.exports = router;
