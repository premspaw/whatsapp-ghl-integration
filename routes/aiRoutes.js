const express = require('express');

module.exports = (aiService, mcpAIService, enhancedAIService) => {
  const router = express.Router();

  // Minimal health endpoint to prevent startup crash
  router.get('/health', (req, res) => {
    const stats = enhancedAIService && enhancedAIService.getConversationStats
      ? enhancedAIService.getConversationStats()
      : {};
    res.json({ success: true, service: 'ai', stats, timestamp: Date.now() });
  });

  return router;
};