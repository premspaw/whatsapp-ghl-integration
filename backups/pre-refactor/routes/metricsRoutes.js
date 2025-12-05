const express = require('express');

module.exports = () => {
  const router = express.Router();

  // Simple system/code metrics endpoint
  router.get('/metrics', (req, res) => {
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();
    const now = Date.now();

    const aiConfigured = Boolean(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY);
    const ghlConfigured = Boolean(process.env.GHL_API_KEY || process.env.LEADCONNECTOR_API_KEY);
    const whatsappMock = String(process.env.USE_MOCK_WHATSAPP || '').toLowerCase() === 'true';

    res.json({
      success: true,
      app: 'ghl-whatsapp',
      codeMetricsUrl: 'http://bit.ly/code-metrics',
      timestamp: now,
      uptimeSec: Math.round(process.uptime()),
      memory: {
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
        external: mem.external
      },
      cpu: {
        userMicros: cpu.user,
        systemMicros: cpu.system
      },
      env: {
        aiConfigured,
        ghlConfigured,
        whatsappMock
      },
      pid: process.pid
    });
  });

  return router;
};