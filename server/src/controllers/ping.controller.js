const { getPing } = require('../services/ping.service');

const ping = (req, res) => {
  res.status(200).json({
    success: true,
    data: getPing(),
  });
};

module.exports = { ping };