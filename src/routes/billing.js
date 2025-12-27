const express = require('express');
const router = express.Router();
const billingService = require('../services/billing');
const logger = require('../utils/logger');

/**
 * GET /api/billing/status
 * Get wallet status for a location
 */
router.get('/status', (req, res) => {
    try {
        const locationId = req.query.location_id || req.query.locationId || 'default';
        const billing = billingService.getBilling(locationId);
        res.json({ success: true, billing });
    } catch (error) {
        logger.error('Error getting billing status', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/billing/all
 * Get all billing configurations
 */
router.get('/all', (req, res) => {
    try {
        const allBilling = billingService.getAllBilling();
        res.json({ success: true, allBilling });
    } catch (error) {
        logger.error('Error getting all billing', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/billing/recharge
 * Recharge wallet for a location
 */
router.post('/recharge', (req, res) => {
    try {
        const { locationId, amount } = req.body;
        if (!locationId || !amount) {
            return res.status(400).json({ error: 'locationId and amount are required' });
        }

        const billing = billingService.recharge(locationId, parseFloat(amount));
        res.json({ success: true, billing });
    } catch (error) {
        logger.error('Error recharging wallet', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/billing/set-rate
 * Set AI response rate (Admin only in concept, here unprotected for simplicity)
 */
router.post('/set-rate', (req, res) => {
    try {
        const { locationId, rate } = req.body;
        if (!locationId || rate === undefined) {
            return res.status(400).json({ error: 'locationId and rate are required' });
        }

        const billing = billingService.setRate(locationId, parseFloat(rate));
        res.json({ success: true, billing });
    } catch (error) {
        logger.error('Error setting rate', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
