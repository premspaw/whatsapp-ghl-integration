const express = require('express');
const WebhookService = require('../services/webhookService');

module.exports = () => {
    const router = express.Router();
    const webhookService = new WebhookService();

    // GHL Automation Webhook
    // URL: /webhooks/ghl-automation
    router.post('/ghl-automation', async (req, res) => {
        try {
            console.log('🪝 Received GHL Automation Webhook');
            const webhookData = req.body;
            const tenantId = req.headers['x-tenant-id'] || null;

            await webhookService.processGHLWebhook(webhookData, tenantId);

            res.json({ success: true, message: 'Webhook processed' });
        } catch (error) {
            console.error('Error processing webhook:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // General GHL Webhook (alias)
    // URL: /webhooks/ghl
    router.post('/ghl', async (req, res) => {
        try {
            console.log('🪝 Received GHL General Webhook');
            const webhookData = req.body;
            const tenantId = req.headers['x-tenant-id'] || null;

            await webhookService.processGHLWebhook(webhookData, tenantId);

            res.json({ success: true, message: 'Webhook processed' });
        } catch (error) {
            console.error('Error processing webhook:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
};
