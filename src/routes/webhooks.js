const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const whatsappManager = require('../services/whatsapp/manager');
const logger = require('../utils/logger');
const statsService = require('../services/stats');
const ghlContacts = require('../services/ghl/contacts');

/**
 * Webhook endpoint for GHL to send messages via WhatsApp
 * POST /api/webhooks/ghl/message
 * Body: { phone, message, templateName, variables, attachments, locationId }
 */
router.post('/ghl/message', async (req, res) => {
    try {
        const { phone, message, templateName, variables, attachments, buttons, mediaType, locationId } = req.body;

        const targetLocationId = locationId || req.query.locationId || 'default';

        if (!phone) {
            return res.status(400).json({ error: 'Phone is required' });
        }

        const client = await whatsappManager.getInstance(targetLocationId);
        if (!client || !client.isReady) {
            return res.status(503).json({ error: `WhatsApp client not ready for location ${targetLocationId}` });
        }

        let finalMessage = message || '';
        let finalMediaUrl = (attachments && attachments.length > 0) ? attachments[0] : null;
        let finalMediaType = mediaType || 'image';

        // If templateName is provided, override message and media from template
        if (templateName) {
            try {
                const TEMPLATES_FILE = path.join(process.cwd(), 'data', 'templates.json');
                if (fs.existsSync(TEMPLATES_FILE)) {
                    const templates = JSON.parse(fs.readFileSync(TEMPLATES_FILE, 'utf8') || '{}');
                    const template = Object.values(templates).find(t => t.name === templateName);

                    if (template) {
                        finalMessage = template.content;
                        finalMediaUrl = finalMediaUrl || template.mediaUrl;
                        finalMediaType = mediaType || template.mediaType || 'image';

                        // Replace variables if provided
                        if (variables) {
                            Object.entries(variables).forEach(([key, value]) => {
                                finalMessage = finalMessage.replace(new RegExp(`{${key}}`, 'g'), value);
                            });
                        }
                    } else {
                        logger.warn(`Template "${templateName}" not found, using raw message.`);
                    }
                }
            } catch (tplErr) {
                logger.error('Error loading template in webhook', tplErr);
            }
        }

        if (!finalMessage && !finalMediaUrl) {
            return res.status(400).json({ error: 'Message or template content is required' });
        }

        // Anti-Echo Check: Do not send internal sync placeholders back to WhatsApp
        // These are usually triggered by GHL Workflows echoing our own synced messages
        const isSyncPlaceholder = finalMessage && /\[.*Attachment\]/.test(finalMessage);
        if (isSyncPlaceholder && !finalMediaUrl) {
            logger.info('⏭️ [Webhook] Skipping outbound echo of internal sync placeholder', { finalMessage });
            return res.json({ success: true, message: 'skipped_echo' });
        }

        logger.info('📤 Outbound message from GHL', { phone, templateName, hasMedia: !!finalMediaUrl, hasButtons: !!buttons });

        const result = await client.sendMessage(phone, finalMessage, finalMediaUrl, finalMediaType, buttons);

        statsService.incrementStat('totalMessagesSent', targetLocationId);

        if (templateName) {
            statsService.incrementStat('totalTemplatesSent', targetLocationId);
        } else {
            statsService.incrementStat('totalAiResponses', targetLocationId);
        }

        // Always bill for GHL automated/template outbound messages
        const billingService = require('../services/billing');
        billingService.deductCredit(targetLocationId);

        res.json({
            success: true,
            messageId: result.id?._serialized || result.id,
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

        logger.info('📨 GHL Conversation webhook', {
            event,
            fullBody: JSON.stringify(req.body),
            headers: req.headers
        });

        // Deduplication Helper: Skip messages sent from our own provider CID to prevent loops
        const PROVIDER_ID = '69306e4ed1e0a0573cdc2207';
        const isSelfSent = (p) => (p.conversationProviderId === PROVIDER_ID || (p.body && p.body.conversationProviderId === PROVIDER_ID));

        // Handle different conversation events
        if (req.body.type === 'SMS' && req.body.phone && req.body.message) {
            // This is the GHL Conversation Provider Outbound Message Payload
            const { phone, message, locationId, attachments } = req.body;

            if (isSelfSent(req.body)) {
                logger.info('⏭️ [Webhook] Skipping "SMS" type message from our own provider (Deduplication)');
                return res.json({ success: true, message: 'skipped_self' });
            }

            logger.info('🚀 Processing GHL Outbound Message via WhatsApp Provider', { phone, locationId });

            const client = await whatsappManager.getInstance(locationId || 'default');
            if (client && client.isReady) {
                const mediaUrl = (attachments && attachments.length > 0) ? attachments[0] : null;
                await client.sendMessage(phone, message, mediaUrl);
                statsService.incrementStat('totalMessagesSent', locationId); // Track stat
                return res.json({ success: true, messageId: 'sent' });
            } else {
                logger.warn('WhatsApp client not ready for outbound message', { locationId });
                return res.json({ success: false, error: 'WhatsApp not connected' });
            }
        }

        // Handle GHL Outbound Message Event (Missing Phone in Payload)
        if (req.body.type === 'OutboundMessage') {
            const { contactId, locationId, body, attachments } = req.body;

            if (isSelfSent(req.body)) {
                logger.info('⏭️ [Webhook] Skipping "OutboundMessage" type from our own provider (Deduplication)');
                return res.json({ success: true, message: 'skipped_self' });
            }

            logger.info('🚀 Processing OutboundMessage Event', { contactId, locationId });

            try {
                // 1. Fetch Contact to get Phone
                logger.info('Fetching contact details from GHL...', { contactId });
                const contact = await ghlContacts.getContact(locationId, contactId);

                if (contact && contact.phone) {
                    logger.info('Contact found, sending WhatsApp...', { phone: contact.phone });
                    // 2. Send via WhatsApp
                    const client = await whatsappManager.getInstance(locationId || 'default');
                    if (client && client.isReady) {
                        const mediaUrl = (attachments && attachments.length > 0) ? attachments[0] : null;
                        await client.sendMessage(contact.phone, body, mediaUrl);
                        statsService.incrementStat('totalMessagesSent', locationId); // Track stat
                        logger.info('✅ OutboundMessage Sent via WhatsApp', { phone: contact.phone });
                    } else {
                        logger.warn('WhatsApp Client NOT READY for location', { locationId });
                    }
                } else {
                    logger.warn('Contact phone not found for OutboundMessage', { contactId, contactData: contact });
                }
            } catch (err) {
                logger.error('Failed to process OutboundMessage', {
                    message: err.message,
                    stack: err.stack,
                    response: err.response?.data
                });
            }
        }

        switch (event) {
            case 'conversation.message.created':
                // New message in GHL - might need to send via WhatsApp
                logger.info('New message in GHL conversation', data);
                break;

            case 'conversation.created':
                logger.info('New conversation created in GHL', data);
                break;

            default:
                // Handle UNINSTALL event
                if (req.body.type === 'UNINSTALL' && req.body.locationId) {
                    const locationId = req.body.locationId;
                    logger.info(`🗑️ GHL App UNINSTALLED for location: ${locationId}`);

                    // Delete from database
                    const supabase = require('../config/supabase');
                    if (supabase) {
                        await supabase
                            .from('ghl_integrations')
                            .delete()
                            .eq('location_id', locationId);
                        logger.info(`✅ Deleted location ${locationId} from database`);
                    }

                    // Delete from memory
                    const ghlOAuth = require('../services/ghl/oauth');
                    if (ghlOAuth.tokens[locationId]) {
                        delete ghlOAuth.tokens[locationId];
                        ghlOAuth._saveLocalTokens();
                        logger.info(`✅ Deleted location ${locationId} from memory`);
                    }
                } else {
                    logger.info('Unhandled conversation event', { event, body: req.body });
                }
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
