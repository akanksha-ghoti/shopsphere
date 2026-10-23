const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { ping } = require('../controllers/ping.controller');

const router = express.Router();

router.get('/', asyncHandler(ping));

module.exports = router;