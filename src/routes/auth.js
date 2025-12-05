const express = require('express');
const router = express.Router();
const ghlOAuth = require('../services/ghl/oauth');
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

module.exports = router;
