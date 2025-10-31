const express = require('express');

module.exports = (ghlService) => {
  const router = express.Router();

  // Minimal health endpoint to prevent startup crash
  router.get('/health', (req, res) => {
    res.json({ success: true, service: 'ghl', timestamp: Date.now() });
  });

  return router;
};