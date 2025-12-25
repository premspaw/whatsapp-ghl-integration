const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const whatsappManager = require('../services/whatsapp/manager');
const logger = require('../utils/logger');
const statsService = require('../services/stats');
const ghlContacts = require('../services/ghl/contacts');
const ghlConversations = require('../services/ghl/conversations');

/**
 * Helper to get locationId from request
 */
const getLocationId = (req) => {
    return req.query.location_id ||
        req.body.locationId ||
        req.query.locationId ||
        (req.body.location && req.body.location.id) ||
        'default';
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

// GET /api/whatsapp/qr-image
router.get('/qr-image', async (req, res) => {
    try {
        const locationId = getLocationId(req);
        const client = await whatsappManager.getInstance(locationId);

        if (client.qrText) {
            const QRCode = require('qrcode');
            const pngBuffer = await QRCode.toBuffer(client.qrText, { type: 'png', margin: 1, scale: 8 });
            res.set('Content-Type', 'image/png');
            res.send(pngBuffer);
        } else {
            res.status(404).json({ error: 'No QR code available' });
        }
    } catch (error) {
        logger.error('Error getting QR image', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/restart', async (req, res) => {
    try {
        const locationId = getLocationId(req);
        await whatsappManager.removeInstance(locationId);
        const client = await whatsappManager.getInstance(locationId);
        res.json({ success: true, locationId, isReady: client.isReady });
    } catch (error) {
        logger.error('Error restarting WhatsApp client', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/logout', async (req, res) => {
    try {
        const locationId = getLocationId(req);
        await whatsappManager.removeInstance(locationId);
        await whatsappManager.clearAuth(locationId);
        res.json({ success: true, locationId });
    } catch (error) {
        logger.error('Error logging out WhatsApp client', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/debug', async (req, res) => {
    try {
        const locationId = getLocationId(req);
        const client = await whatsappManager.getInstance(locationId);
        const authDir = path.join(process.cwd(), 'data', '.wwebjs_auth', locationId);
        const authPathExists = fs.existsSync(authDir);
        const executablePath = client.puppeteerExecutablePath || process.env.PUPPETEER_EXECUTABLE_PATH || null;
        const executableExists = executablePath ? fs.existsSync(executablePath) : null;
        res.json({ locationId, isReady: client.isReady, hasQRCode: !!client.qrCode, authDir, authPathExists, executablePath, executableExists });
    } catch (error) {
        logger.error('Error getting WhatsApp debug info', error);
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

// Helper to sync outbound message to GHL
async function syncOutboundMessage(locationId, phone, message, attachments = [], contactId = null) {
    try {
        if (locationId === 'default') return;

        let finalContactId = contactId;

        // If no contactId provided, search by phone
        if (!finalContactId) {
            const contact = await ghlContacts.searchContactByPhone(locationId, phone);
            if (contact) finalContactId = contact.id;
        }

        if (!finalContactId) {
            logger.warn('Cannot sync outbound: Contact not found in GHL', { phone, locationId });
            return;
        }

        // 2. Get/Create Conversation
        const conversation = await ghlConversations.getOrCreateConversation(locationId, finalContactId);

        // 3. Add to Conversation
        await ghlConversations.sendMessage(
            locationId,
            conversation.id,
            message,
            'Custom', // type
            finalContactId,
            'outbound',
            null,
            'ai_whatsapp_custom_app', // Provider ID
            attachments
        );
        logger.info('✅ Outbound message synced to GHL', { locationId, phone, contactId: finalContactId });
    } catch (error) {
        logger.error('Failed to sync outbound message to GHL', { locationId, error: error.message });
    }
}

// POST /api/whatsapp/send
router.post('/send', async (req, res) => {
    try {
        const locationId = getLocationId(req);
        const clientInstance = await whatsappManager.getInstance(locationId);

        const { to, message, mediaUrl, mediaType, contact_id, contact } = req.body;
        const contactId = contact_id || (contact && contact.id);
        if (!to || (!message && !mediaUrl)) {
            return res.status(400).json({ error: 'Missing to or message/media' });
        }

        await clientInstance.sendMessage(to, message, mediaUrl, mediaType);
        statsService.incrementStat('totalMessagesSent', locationId);

        // Sync to GHL
        const attachments = mediaUrl ? [mediaUrl] : [];
        syncOutboundMessage(locationId, to, message || (mediaUrl ? `[Media: ${mediaType}]` : ''), attachments, contactId);

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

        // Extract Contact ID from various GHL payload locations
        const contactId = payload.contact_id ||
            (payload.contact && payload.contact.id) ||
            (payload.body && payload.body.contact_id);

        if (to) to = to.toString().replace(/\s+/g, '');
        if (templateName) templateName = templateName.toString().trim();

        if (typeof variables === 'string') {
            try { variables = JSON.parse(variables); } catch (e) { }
        }

        if (!to || !templateName) {
            return res.status(400).json({ error: 'Missing to or templateName' });
        }

        const TEMPLATES_FILE = path.join(process.cwd(), 'data', 'templates.json');
        let allTemplates = {};
        if (fs.existsSync(TEMPLATES_FILE)) {
            allTemplates = JSON.parse(fs.readFileSync(TEMPLATES_FILE, 'utf8') || '{}');
        }

        // Find template by name AND locationId (with legacy fallback to default)
        const template = Object.values(allTemplates).find(t => {
            const isNameMatch = t.name === templateName;
            const tLoc = t.locationId || 'default';
            return isNameMatch && tLoc === locationId;
        });

        if (!template) {
            logger.warn(`Template "${templateName}" not found for location ${locationId}`);
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
        statsService.incrementStat('totalMessagesSent', locationId);
        statsService.incrementStat('totalTemplatesSent', locationId);

        // Sync to GHL
        const attachments = finalMediaUrl ? [finalMediaUrl] : [];
        syncOutboundMessage(locationId, to, content, attachments, contactId);

        res.json({ success: true, message: 'Template sent', to, templateName, locationId });
    } catch (error) {
        logger.error('Error sending template', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/whatsapp/analytics
router.get('/analytics', (req, res) => {
    try {
        const locationId = getLocationId(req);
        const stats = statsService.getStats(locationId);
        res.json({ success: true, stats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
