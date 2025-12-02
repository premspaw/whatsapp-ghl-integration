const express = require('express');
const { normalize } = require('../utils/phoneNormalizer');

module.exports = (whatsappService, conversationManager) => {
  const router = express.Router();

  router.post('/outbound', async (req, res) => {
    try {
      const body = req.body || {};
      const type = String(body.type || '').toUpperCase();
      const phone = body.phone || body.toNumber || body.to || '';
      const text = body.message || body.body || '';
      if (!phone || !text) {
        return res.status(400).json({ success: false, error: 'Missing phone or message' });
      }
      if (!whatsappService) {
        return res.status(500).json({ success: false, error: 'WhatsApp service not available' });
      }
      const normalized = normalize(String(phone));
      if (!normalized) {
        return res.status(400).json({ success: false, error: 'Invalid phone number format' });
      }
      const chatId = normalized.replace('+', '') + '@c.us';
      const result = await whatsappService.sendMessage(chatId, text);
      try {
        if (conversationManager && typeof conversationManager.addMessage === 'function') {
          await conversationManager.addMessage({
            id: result?.id?._serialized || `sent_${Date.now()}`,
            from: 'ai',
            body: text,
            timestamp: Date.now(),
            type: type === 'SMS' ? 'text' : type || 'text'
          }, normalized);
        }
      } catch (_) {}
      res.json({ success: true, result: { id: result?.id?._serialized, to: normalized, body: text } });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};

