const express = require('express');
const router = express.Router();
const whatsappClient = require('../services/whatsapp/client');
const logger = require('../utils/logger');

/**
 * Webhook endpoint for GHL to send messages via WhatsApp
 * POST /api/webhooks/ghl/message
 * Body: { phone, message, conversationId }
 */
router.post('/ghl/message', async (req, res) => {
    try {
        const { phone, message, conversationId, contactId } = req.body;

        if (!phone || !message) {
            return res.status(400).json({ error: 'Phone and message are required' });
        }

        logger.info('📤 Outbound message from GHL', { phone, conversationId });

        // Send message via WhatsApp
        const result = await whatsappClient.sendMessage(phone, message);

        logger.info('✅ Message sent via WhatsApp', { phone, messageId: result.id._serialized });

        res.json({
            success: true,
            messageId: result.id._serialized,
            timestamp: result.timestamp
        });

    } catch (error) {
        logger.error('❌ Failed to send WhatsApp message', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * Webhook endpoint for GHL conversation events
 * POST /api/webhooks/ghl/conversation
 */
router.post('/ghl/conversation', async (req, res) => {
    try {
        const { event, data } = req.body;

        logger.info('📨 GHL Conversation webhook', { event });

        // Handle different conversation events
        switch (event) {
            case 'conversation.message.created':
                // New message in GHL - might need to send via WhatsApp
                logger.info('New message in GHL conversation', data);
                break;

            case 'conversation.created':
                logger.info('New conversation created in GHL', data);
                break;

            default:
                logger.info('Unhandled conversation event', { event });
        }

        res.json({ success: true });

    } catch (error) {
        logger.error('❌ Webhook processing error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

/**
 * Health check for webhooks
 */
router.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'webhooks' });
});

module.exports = router;
