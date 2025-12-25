const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const whatsappManager = require('../services/whatsapp/manager');
const logger = require('../utils/logger');
const statsService = require('../services/stats');

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

        logger.info('📤 Outbound message from GHL', { phone, templateName, hasMedia: !!finalMediaUrl, hasButtons: !!buttons });

        const result = await client.sendMessage(phone, finalMessage, finalMediaUrl, finalMediaType, buttons);

        statsService.incrementStat('totalMessagesSent');
        if (templateName) statsService.incrementStat('totalTemplatesSent');

        // If the message is coming from GHL, we can assume it's part of the AI flow if it's an automated reply
        // For now, let's treat all outbound GHL messages as potential AI responses for tracking
        statsService.incrementStat('totalAiResponses');

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
                logger.info('Unhandled conversation event', { event, body: req.body });
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
