const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const whatsappClient = require('../services/whatsapp/client');
const logger = require('../utils/logger');

// GET /api/whatsapp/status
router.get('/status', (req, res) => {
    try {
        const status = {
            isReady: whatsappClient.isReady,
            status: whatsappClient.isReady ? 'connected' : 'disconnected',
            hasQRCode: !!whatsappClient.qrCode
        };
        res.json(status);
    } catch (error) {
        logger.error('Error getting status', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/whatsapp/qr-code
router.get('/qr-code', (req, res) => {
    try {
        if (whatsappClient.qrCode) {
            res.json({ qrCode: whatsappClient.qrCode });
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
        if (!whatsappClient.isReady) {
            return res.status(503).json({ error: 'WhatsApp client not ready' });
        }

        const chats = await whatsappClient.client.getChats();

        // Format chats for dashboard
        const conversations = await Promise.all(chats.map(async (chat) => {
            let contactName = chat.name;
            let phoneNumber = chat.id.user;

            try {
                const contact = await chat.getContact();
                contactName = contactName || contact.pushname || contact.name || contact.number;
                phoneNumber = contact.number;
            } catch (err) {
                // Ignore contact fetching errors
            }

            // Fallback if name is still empty
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
        const { to, message, mediaUrl, mediaType } = req.body;
        if (!to || (!message && !mediaUrl)) {
            return res.status(400).json({ error: 'Missing to or message/media' });
        }

        await whatsappClient.sendMessage(to, message, mediaUrl, mediaType);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error sending message', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/whatsapp/send-template
router.post('/send-template', async (req, res) => {
    try {
        logger.info('Incoming send-template request:', { body: req.body, headers: req.headers });
        const { to, templateName, variables, mediaUrl, mediaType } = req.body;
        if (!to || !templateName) {
            return res.status(400).json({ error: 'Missing to or templateName', received: { to, templateName } });
        }

        // Load templates
        const TEMPLATES_FILE = path.join(process.cwd(), 'data', 'templates.json');
        let templates = {};
        if (fs.existsSync(TEMPLATES_FILE)) {
            templates = JSON.parse(fs.readFileSync(TEMPLATES_FILE, 'utf8') || '{}');
        }

        // Find template by name
        const template = Object.values(templates).find(t => t.name === templateName);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // Replace variables
        let content = template.content;
        if (variables) {
            Object.entries(variables).forEach(([key, value]) => {
                const regex = new RegExp(`{${key}}`, 'g');
                content = content.replace(regex, value);
            });
        }

        // Use media from template if not provided in payload
        const finalMediaUrl = mediaUrl || template.mediaUrl;
        const finalMediaType = mediaType || template.mediaType;

        await whatsappClient.sendMessage(to, content, finalMediaUrl, finalMediaType);
        res.json({ success: true, message: 'Template sent' });
    } catch (error) {
        logger.error('Error sending template', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
