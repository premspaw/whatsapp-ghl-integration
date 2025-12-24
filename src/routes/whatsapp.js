const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const whatsappManager = require('../services/whatsapp/manager');
const logger = require('../utils/logger');
const statsService = require('../services/stats');

/**
 * Helper to get locationId from request
 */
const getLocationId = (req) => {
    return req.query.location_id || req.body.locationId || req.query.locationId || 'default';
};

// GET /api/whatsapp/status
router.get('/status', async (req, res) => {
    try {
        const locationId = getLocationId(req);
        const client = await whatsappManager.getInstance(locationId);

        const status = {
            locationId,
            isReady: client.isReady,
            status: client.isReady ? 'connected' : 'disconnected',
            hasQRCode: !!client.qrCode
        };
        res.json(status);
    } catch (error) {
        logger.error('Error getting status', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/whatsapp/qr-code
router.get('/qr-code', async (req, res) => {
    try {
        const locationId = getLocationId(req);
        const client = await whatsappManager.getInstance(locationId);

        if (client.qrCode) {
            res.json({ qrCode: client.qrCode });
        } else {
            res.status(404).json({ error: 'No QR code available' });
        }
    } catch (error) {
        logger.error('Error getting QR code', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/whatsapp/conversations
router.get('/conversations', async (req, res) => {
    try {
        const locationId = getLocationId(req);
        const clientInstance = await whatsappManager.getInstance(locationId);

        if (!clientInstance.isReady) {
            return res.status(503).json({ error: 'WhatsApp client not ready' });
        }

        const chats = await clientInstance.client.getChats();

        // Format chats for dashboard
        const conversations = await Promise.all(chats.map(async (chat) => {
            let contactName = chat.name;
            let phoneNumber = chat.id.user;

            try {
                const contact = await chat.getContact();
                contactName = contactName || contact.pushname || contact.name || contact.number;
                phoneNumber = contact.number;
            } catch (err) { }

            if (!contactName) contactName = `+${phoneNumber}`;

            const messages = await chat.fetchMessages({ limit: 20 });

            return {
                id: chat.id._serialized,
                name: contactName,
                phoneNumber: phoneNumber,
                unreadCount: chat.unreadCount,
                timestamp: chat.timestamp,
                updatedAt: chat.timestamp * 1000,
                messages: messages.map(m => ({
                    id: m.id._serialized,
                    from: m.from,
                    to: m.to,
                    body: m.body,
                    timestamp: m.timestamp,
                    hasMedia: m.hasMedia,
                    direction: m.fromMe ? 'outbound' : 'inbound'
                }))
            };
        }));

        res.json({ success: true, conversations });
    } catch (error) {
        logger.error('Error getting conversations', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/whatsapp/send
router.post('/send', async (req, res) => {
    try {
        const locationId = getLocationId(req);
        const clientInstance = await whatsappManager.getInstance(locationId);

        const { to, message, mediaUrl, mediaType } = req.body;
        if (!to || (!message && !mediaUrl)) {
            return res.status(400).json({ error: 'Missing to or message/media' });
        }

        await clientInstance.sendMessage(to, message, mediaUrl, mediaType);
        statsService.incrementStat('totalMessagesSent');
        res.json({ success: true, locationId });
    } catch (error) {
        logger.error('Error sending message', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/whatsapp/send-template
router.post('/send-template', async (req, res) => {
    try {
        const payload = req.body;
        const locationId = getLocationId(req);
        const clientInstance = await whatsappManager.getInstance(locationId);

        logger.info('Incoming send-template request:', { locationId, body: payload });

        let to = payload.to || (payload.customData ? payload.customData.to : null);
        let templateName = payload.templateName || (payload.customData ? payload.customData.templateName : null);
        let variables = payload.variables || (payload.customData ? payload.customData.variables : null);
        let mediaUrl = payload.mediaUrl || (payload.customData ? payload.customData.mediaUrl : null);
        let mediaType = payload.mediaType || (payload.customData ? payload.customData.mediaType : null);

        if (to) to = to.toString().replace(/\s+/g, '');
        if (templateName) templateName = templateName.toString().trim();

        if (typeof variables === 'string') {
            try { variables = JSON.parse(variables); } catch (e) { }
        }

        if (!to || !templateName) {
            return res.status(400).json({ error: 'Missing to or templateName' });
        }

        const TEMPLATES_FILE = path.join(process.cwd(), 'data', 'templates.json');
        let templates = {};
        if (fs.existsSync(TEMPLATES_FILE)) {
            templates = JSON.parse(fs.readFileSync(TEMPLATES_FILE, 'utf8') || '{}');
        }

        const template = Object.values(templates).find(t => t.name === templateName);
        if (!template) {
            return res.status(404).json({ error: `Template "${templateName}" not found` });
        }

        let content = template.content;
        if (variables) {
            Object.entries(variables).forEach(([key, value]) => {
                const regex = new RegExp(`{${key}}`, 'g');
                content = content.replace(regex, value);
            });
        }

        const finalMediaUrl = mediaUrl || template.mediaUrl;
        const finalMediaType = mediaType || template.mediaType;

        await clientInstance.sendMessage(to, content, finalMediaUrl, finalMediaType);
        statsService.incrementStat('totalMessagesSent');
        statsService.incrementStat('totalTemplatesSent');
        res.json({ success: true, message: 'Template sent', to, templateName, locationId });
    } catch (error) {
        logger.error('Error sending template', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/whatsapp/analytics
router.get('/analytics', (req, res) => {
    try {
        const stats = statsService.getStats();
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
