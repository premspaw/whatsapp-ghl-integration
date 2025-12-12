const express = require('express');
const router = express.Router();
const whatsappClient = require('../services/whatsapp/client');
const logger = require('../utils/logger');
const ghlContacts = require('../services/ghl/contacts');

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
        logger.info('📨 GHL Conversation webhook received');
        logger.info('Headers:', JSON.stringify(req.headers, null, 2));
        logger.info('Body:', JSON.stringify(req.body, null, 2));

        const { event, data } = req.body;

        if (!event || !data) {
            logger.warn('⚠️ Webhook received but event or data is missing', req.body);
            return res.json({ success: false, reason: 'missing_event_or_data' });
        }

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

                    let targetPhone = data.phone || data.contactPhone;

                    // If phone is missing, fetch contact from GHL
                    if (!targetPhone && data.contactId) {
                        try {
                            logger.info('Fetching contact details for', { contactId: data.contactId });
                            const contact = await ghlContacts.getContact(data.contactId);
                            if (contact && contact.phone) {
                                targetPhone = contact.phone;
                                logger.info('Found phone number from contact', { phone: targetPhone });
                            }
                        } catch (err) {
                            logger.error('Failed to fetch contact', err);
                        }
                    }

                    if (targetPhone) {
                        try {
                            await whatsappClient.sendMessage(targetPhone, messageBody);
                            logger.info('✅ AI Message sent to WhatsApp', { phone: targetPhone });
                        } catch (err) {
                            logger.error('Failed to send AI message', err);
                        }
                    } else {
                        logger.warn('⚠️ Could not find phone number in message event', data);
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
