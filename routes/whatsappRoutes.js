const express = require('express');

module.exports = (whatsappService, ghlService, enhancedAIService, conversationManager) => {
  const router = express.Router();

  // Simple health check
  router.get('/health', (req, res) => {
    res.json({ success: true, service: 'whatsapp', timestamp: Date.now() });
  });

  // WhatsApp conversations endpoint for custom tab
  router.get('/conversations', async (req, res) => {
    try {
      const conversations = await conversationManager.getAllConversations();

      // Format conversations and enrich with GHL contact name if available
      const formatted = await Promise.all((conversations || []).map(async (conv) => {
        let contactName = conv.contactName || conv.name || 'Unknown Contact';

        try {
          const phoneRaw = conv.phoneNumber || conv.phone;
          const normalized = ghlService && ghlService.normalizePhoneNumber
            ? ghlService.normalizePhoneNumber(phoneRaw)
            : null;

          if (normalized && ghlService && ghlService.findContactByPhone) {
            const ghlContact = await ghlService.findContactByPhone(normalized);
            if (ghlContact) {
              contactName = ghlContact.firstName || ghlContact.name || contactName;
            }
          }
        } catch (_) {
          // Non-fatal enrichment failure; keep fallback name
        }

        return {
          id: conv.id || (conv.phoneNumber || conv.phone),
          contactName,
          phoneNumber: conv.phoneNumber || conv.phone,
          messages: conv.messages || [],
          lastMessage: (conv.messages && conv.messages.length > 0)
            ? conv.messages[conv.messages.length - 1]
            : null,
          aiEnabled: !!conv.aiEnabled,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt
        };
      }));

      res.json({ success: true, conversations: formatted, total: formatted.length });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Send a WhatsApp message
  router.post('/send', async (req, res) => {
    try {
      const { to, message, body } = req.body || {};
      const text = typeof message === 'string' ? message : body;
      if (!to || !text) {
        return res.status(400).json({ success: false, error: 'Missing required fields: to, message' });
      }

      if (!whatsappService || typeof whatsappService.sendMessage !== 'function') {
        return res.status(500).json({ success: false, error: 'WhatsApp service not available' });
      }

      // Normalize phone number to WhatsApp chat ID
      let chatId = to;
      if (!String(chatId).includes('@c.us')) {
        chatId = String(chatId).replace(/[^\d+]/g, '');
        if (chatId.startsWith('+')) chatId = chatId.substring(1);
        chatId = chatId + '@c.us';
      }

      const result = await whatsappService.sendMessage(chatId, text);

      // Optionally record into conversation manager
      try {
        if (conversationManager && typeof conversationManager.addMessage === 'function') {
          await conversationManager.addMessage(to, {
            id: result?.id?._serialized || `sent_${Date.now()}`,
            from: 'me',
            body: text,
            timestamp: Date.now(),
            type: 'text'
          });
        }
      } catch (_) { /* non-fatal */ }

      res.json({ success: true, result: {
        id: result?.id?._serialized,
        to: to,
        chatId,
        body: text
      }});
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};