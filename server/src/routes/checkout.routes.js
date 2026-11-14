const express = require('express');
const { z } = require('zod');

const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createCheckoutSession,
  createCheckoutSummary,
} = require('../controllers/checkout.controller');

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
router.post('/sessions', validate(checkoutSummarySchema), createCheckoutSession);

module.exports = router;
