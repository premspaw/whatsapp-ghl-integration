const express = require('express');
const router = express.Router();
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
            const contact = await chat.getContact();
            const messages = await chat.fetchMessages({ limit: 20 });

            return {
                id: chat.id._serialized,
                name: chat.name || contact.pushname || contact.number,
                phoneNumber: contact.number,
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
        const { to, message } = req.body;
        if (!to || !message) {
            return res.status(400).json({ error: 'Missing to or message' });
        }

        await whatsappClient.sendMessage(to, message);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error sending message', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
