const express = require('express');
const router = express.Router();
const ghlOAuth = require('../services/ghl/oauth');
const config = require('../config/env');
const logger = require('../utils/logger');

// Start OAuth flow
router.get('/oauth/authorize', (req, res) => {
    const url = ghlOAuth.getAuthorizeUrl(req.query.state);
    res.redirect(url);
});

// OAuth Callback
router.get('/oauth/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('No code provided');
    }

    try {
        const token = await ghlOAuth.exchangeCodeForToken(code);
        res.json({ success: true, message: 'GHL Connected Successfully', locationId: token.locationId });
    } catch (error) {
        logger.error('OAuth Callback Error', { error: error.message });
        res.status(500).send('Authentication Failed');
    }
});

// POST /api/auth/apikey - Register a manual API Key for a location
router.post('/apikey', async (req, res) => {
    try {
        const { locationId, apiKey } = req.body;
        if (!locationId || !apiKey) {
            return res.status(400).json({ error: 'locationId and apiKey are required' });
        }

        await ghlOAuth.saveTokens(locationId, {
            access_token: apiKey,
            refresh_token: '',
            expires_in: 0,
            userType: 'ApiKey',
            companyId: 'manual'
        });

        logger.info(`✅ API Key registered for location ${locationId}`);
        res.json({ success: true, locationId });
    } catch (error) {
        logger.error('Error registering API Key', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/auth/locations - List all connected locations (Admin)
router.get('/locations', async (req, res) => {
    try {
        const tokens = ghlOAuth.tokens || {};
        const locations = Object.keys(tokens).map(id => ({
            id,
            userType: tokens[id].user_type,
            companyId: tokens[id].company_id,
            connectedAt: tokens[id].obtained_at
        }));
        res.json({ success: true, locations });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
