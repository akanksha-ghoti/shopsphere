const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');

const router = express.Router();

const sampleSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email'),
  }),
});

router.post('/sample', validate(sampleSchema), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Request validated successfully',
    data: req.validatedData.body,
  });
});

module.exports = router;