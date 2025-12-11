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

        logger.info('📨 GHL Conversation webhook', JSON.stringify(req.body, null, 2));

        // Handle different conversation events
        switch (event) {
            case 'conversation.message.created':
                // New message in GHL
                logger.info('New message event received', data);

                // Check if it's an outbound message (sent by GHL/AI)
                // GHL payload usually has 'direction' or 'type'
                const isOutbound = data.direction === 'outbound' || data.type === 'OutboundMessage';

                if (isOutbound && data.body) {
                    logger.info('🤖 Detected AI/Manual Outbound Message', { body: data.body });

                    // Extract phone number (might need to fetch contact if not in payload)
                    // Usually data.contactId is present.
                    // For now, we try to find the phone from the contact details if available, 
                    // or we might need to query GHL if phone is missing.

                    // NOTE: The payload might not have the phone number directly.
                    // We might need to fetch the contact to get the phone.
                    // But often GHL sends 'phone' or 'contactPhone' in the payload.

                    const targetPhone = data.phone || data.contactPhone;

                    if (targetPhone) {
                        try {
                            await whatsappClient.sendMessage(targetPhone, data.body);
                            logger.info('✅ AI Message sent to WhatsApp', { phone: targetPhone });
                        } catch (err) {
                            logger.error('Failed to send AI message', err);
                        }
                    } else {
                        logger.warn('⚠️ Could not find phone number in message event', data);
                        // Optional: Fetch contact details using data.contactId if needed
                    }
                }
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
