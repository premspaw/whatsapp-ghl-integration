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

  return router;
};