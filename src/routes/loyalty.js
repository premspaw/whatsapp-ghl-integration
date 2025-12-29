const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * @route POST /api/v1/loyalty/visit
 * @desc Webhook endpoint for GHL QR scans (Scan-to-Stamp)
 */
router.post('/visit', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { locationId, contactId, contact_id, location_id } = req.body;

        // GHL webhooks might send contact_id/location_id
        const finalLocationId = locationId || location_id;
        const finalContactId = contactId || contact_id;

        if (!finalLocationId || !finalContactId) {
            return res.status(400).json({ error: 'Missing locationId or contactId' });
        }

        logger.info('🎁 Loyalty Visit Triggered', { finalLocationId, finalContactId });

        // 1. Check if customer exists, or create them
        const { data: customer, error: customerError } = await supabase
            .from('loyalty_customers')
            .select('*')
            .eq('location_id', finalLocationId)
            .eq('contact_id', finalContactId)
            .single();

        let totalVisits = 1;

        if (customer) {
            totalVisits = (customer.total_visits || 0) + 1;
            await supabase
                .from('loyalty_customers')
                .update({ total_visits: totalVisits, updated_at: new Date() })
                .eq('id', customer.id);
        } else {
            // Create new customer record
            await supabase
                .from('loyalty_customers')
                .insert([{
                    location_id: finalLocationId,
                    contact_id: finalContactId,
                    total_visits: 1
                }]);
        }

        // 2. Log the visit history
        await supabase
            .from('loyalty_visits')
            .insert([{
                location_id: finalLocationId,
                contact_id: finalContactId,
                metadata: req.body
            }]);

        res.json({ success: true, totalVisits });
    } catch (error) {
        logger.error('❌ Loyalty Visit Error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route GET /api/v1/loyalty/settings/:locationId
 * @desc Fetch branding and milestones for a specific clinic
 */
router.get('/settings/:locationId', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { locationId } = req.params;

        // Fetch settings
        const { data: settings, error: settingsError } = await supabase
            .from('loyalty_settings')
            .select('*')
            .eq('location_id', locationId)
            .single();

        // Fetch milestones
        const { data: milestones, error: milestonesError } = await supabase
            .from('loyalty_milestones')
            .select('*')
            .eq('location_id', locationId)
            .order('visit_number', { ascending: true });

        // Fetch actions (like review reward)
        const { data: actions, error: actionsError } = await supabase
            .from('loyalty_actions')
            .select('*')
            .eq('location_id', locationId)
            .eq('is_active', true);

        if (settingsError && settingsError.code !== 'PGRST116') {
            logger.error('❌ Settings Query Error', { error: settingsError });
            return res.status(500).json({ error: 'Settings query failed', details: settingsError.message });
        }

        if (milestonesError) {
            logger.error('❌ Milestones Query Error', { error: milestonesError });
        }

        if (actionsError) {
            logger.error('❌ Actions Query Error', { error: actionsError });
        }

        res.json({
            settings: settings || null,
            milestones: milestones || [],
            actions: actions || [],
            debug: { locationId, hasSettings: !!settings }
        });
    } catch (error) {
        logger.error('❌ Loyalty Settings System Error', { error: error.message, stack: error.stack });
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * @route GET /api/v1/loyalty/test
 * @desc Diagnostic endpoint to verify DB schema and connectivity
 */
router.get('/test', async (req, res) => {
    try {
        if (!supabase) return res.status(503).json({ status: 'error', message: 'Supabase not initialized' });

        const results = {};

        // Check ghl_integrations
        const { count: ghlCount, error: ghlError } = await supabase.from('ghl_integrations').select('*', { count: 'exact', head: true });
        results.ghl_integrations = { status: ghlError ? 'error' : 'ok', count: ghlCount, message: ghlError?.message };

        // Check loyalty_settings
        const { count: settingsCount, error: settingsError } = await supabase.from('loyalty_settings').select('*', { count: 'exact', head: true });
        results.loyalty_settings = { status: settingsError ? 'error' : 'ok', count: settingsCount, message: settingsError?.message };

        // Check loyalty_milestones
        const { count: milestonesCount, error: milestonesError } = await supabase.from('loyalty_milestones').select('*', { count: 'exact', head: true });
        results.loyalty_milestones = { status: milestonesError ? 'error' : 'ok', count: milestonesCount, message: milestonesError?.message };

        res.json({
            status: 'Diagnostic Report',
            timestamp: new Date().toISOString(),
            results
        });
    } catch (error) {
        res.status(500).json({ status: 'crash', message: error.message });
    }
});

module.exports = router;
