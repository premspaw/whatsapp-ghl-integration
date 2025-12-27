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
            throw settingsError;
        }

        res.json({
            settings: settings || null,
            milestones: milestones || [],
            actions: actions || []
        });
    } catch (error) {
        logger.error('❌ Loyalty Settings Error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
