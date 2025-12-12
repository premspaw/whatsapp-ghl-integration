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
        logger.info('📤 Outbound Webhook received', JSON.stringify(req.body, null, 2));

        let { phone, message, body, conversationId, contactId } = req.body;

        // GHL sends 'body' for the message content in ProviderOutboundMessage
        const messageContent = message || body;

        if (!messageContent) {
            return res.status(400).json({ error: 'Message content is required' });
        }

        // If phone is missing (common in GHL webhooks), fetch it using contactId
        if (!phone && contactId) {
            try {
                logger.info('Fetching contact to get phone number', { contactId });
                const contact = await ghlContacts.getContact(contactId);
                if (contact && contact.phone) {
                    phone = contact.phone;
                    logger.info('Resolved phone number from contact', { phone });
                }
            } catch (err) {
                logger.error('Failed to fetch contact details', err);
            }
        }

        if (!phone) {
            logger.error('Phone number missing and could not be resolved', { contactId });
            return res.status(400).json({ error: 'Phone number is required' });
        }

        logger.info('📤 Sending Outbound message', { phone, conversationId });

        // Send message via WhatsApp
        const result = await whatsappClient.sendMessage(phone, messageContent);

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
                logger.info('New message event received', {
                    direction: data.direction,
                    type: data.type,
                    body: data.body,
                    message: data.message,
                    contactId: data.contactId
                });

                // Check if it's an outbound message (sent by GHL/AI)
                const isOutbound = data.direction === 'outbound' || data.type === 'OutboundMessage';
                const messageBody = data.body || data.message;

                logger.info('Debug Checks:', { isOutbound, hasMessageBody: !!messageBody });

                if (isOutbound && messageBody) {
                    logger.info('🤖 Detected AI/Manual Outbound Message', { body: messageBody });

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
