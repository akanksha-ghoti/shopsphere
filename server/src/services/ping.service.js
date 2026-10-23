const getPing = () => {
  return {
    message: 'ShopSphere API is running',
    timestamp: new Date().toISOString(),
  };
};

module.exports = { getPing };