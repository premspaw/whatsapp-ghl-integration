const express = require('express');
const router = express.Router();
const whatsappClient = require('../services/whatsapp/client');
const logger = require('../utils/logger');
const ghlContacts = require('../services/ghl/contacts');
const ghlConversations = require('../services/ghl/conversations');

const sentMessages = new Set(); // Simple in-memory cache to prevent duplicates

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
            case 'ConversationUnreadUpdate':
            case 'conversation.message.created':
                // New message in GHL (or unread count update which happens on new message)
                logger.info('Event received:', { event, data });

                // We need to check if there is a new OUTBOUND message
                // Since AI messages might not trigger standard events, we fetch the latest message
                if (data.id || data.conversationId) {
                    const convId = data.id || data.conversationId;

                    try {
                        const messages = await ghlConversations.getMessages(convId, 1);
                        if (messages && messages.length > 0) {
                            const lastMsg = messages[0];

                            // Check if it's outbound and very recent (e.g. last 5 minutes to be safe)
                            const msgDate = new Date(lastMsg.dateAdded);
                            const msgTime = msgDate.getTime();
                            const now = new Date().getTime();
                            const timeDiff = now - msgTime;
                            const isRecent = timeDiff < 300000; // 5 minutes window

                            logger.info('📊 Polling Check:', {
                                id: lastMsg.id,
                                direction: lastMsg.direction,
                                type: lastMsg.type,
                                body: lastMsg.body,
                                dateAdded: lastMsg.dateAdded,
                                timeDiffSeconds: timeDiff / 1000,
                                isRecent
                            });

                            if (lastMsg.direction === 'outbound' && isRecent) {

                                if (sentMessages.has(lastMsg.id)) {
                                    logger.info('⚠️ Message already sent, skipping', { id: lastMsg.id });
                                    break;
                                }

                                logger.info('🤖 Found recent AI/Manual Outbound Message', {
                                    body: lastMsg.body,
                                    id: lastMsg.id
                                });

                                let targetPhone = data.phone || data.contactPhone;

                                // If phone missing in event, fetch from contact
                                if (!targetPhone && (data.contactId || lastMsg.contactId)) {
                                    const cId = data.contactId || lastMsg.contactId;
                                    const contact = await ghlContacts.getContact(cId);
                                    if (contact) targetPhone = contact.phone;
                                }

                                if (targetPhone && lastMsg.body) {
                                    await whatsappClient.sendMessage(targetPhone, lastMsg.body);
                                    logger.info('✅ AI Message sent to WhatsApp via Polling', { phone: targetPhone });

                                    sentMessages.add(lastMsg.id);
                                    // Cleanup cache (optional, remove older IDs to prevent memory leak)
                                    if (sentMessages.size > 1000) {
                                        const it = sentMessages.values();
                                        sentMessages.delete(it.next().value);
                                    }
                                }
                            }
                        }
                    } catch (err) {
                        logger.error('Failed to process conversation update', err);
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
