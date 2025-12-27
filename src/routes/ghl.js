const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * @route POST /api/v1/ghl/add-stamp
 * @desc Manually add a loyalty stamp from GHL (Custom Action/Workflow)
 */
router.post('/add-stamp', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { locationId, contactId, location_id, contact_id } = req.body;

        const finalLocationId = locationId || location_id;
        const finalContactId = contactId || contact_id;

        if (!finalLocationId || !finalContactId) {
            return res.status(400).json({ error: 'Missing locationId or contactId' });
        }

        logger.info('🎁 Manual Stamp Triggered from GHL', { finalLocationId, finalContactId });

        // Check if customer exists, or create them
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
            await supabase
                .from('loyalty_customers')
                .insert([{
                    location_id: finalLocationId,
                    contact_id: finalContactId,
                    total_visits: 1
                }]);
        }

        // Log the visit
        await supabase
            .from('loyalty_visits')
            .insert([{
                location_id: finalLocationId,
                contact_id: finalContactId,
                metadata: { source: 'manual_ghl', ...req.body }
            }]);

        // Check if any milestones were unlocked
        const { data: milestones } = await supabase
            .from('loyalty_milestones')
            .select('*')
            .eq('location_id', finalLocationId)
            .eq('visit_number', totalVisits);

        const unlockedReward = milestones && milestones.length > 0 ? milestones[0] : null;

        res.json({
            success: true,
            totalVisits,
            unlockedReward: unlockedReward ? {
                name: unlockedReward.reward_name,
                visit: unlockedReward.visit_number
            } : null
        });
    } catch (error) {
        logger.error('❌ Manual Stamp Error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route GET /api/v1/ghl/loyalty-link/:contactId
 * @desc Generate personalized loyalty link for GHL contact
 */
router.get('/loyalty-link/:contactId', async (req, res) => {
    try {
        const { contactId } = req.params;
        const { locationId, name, phone } = req.query;

        if (!locationId || !name || !phone) {
            return res.status(400).json({ error: 'Missing required params: locationId, name, phone' });
        }

        // Generate the personalized link
        const baseUrl = process.env.LOYALTY_APP_URL || 'http://localhost:3001';
        const link = `${baseUrl}/rewards/${locationId}?contact=${contactId}&name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}`;

        res.json({
            success: true,
            loyaltyLink: link,
            shortMessage: `🎁 Check your rewards: ${link}`
        });
    } catch (error) {
        logger.error('❌ Loyalty Link Generation Error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @route GET /api/v1/ghl/customer-status/:contactId
 * @desc Get loyalty status for a GHL contact
 */
router.get('/customer-status/:contactId', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({ error: 'Database not available' });
        }

        const { contactId } = req.params;
        const { locationId } = req.query;

        if (!locationId) {
            return res.status(400).json({ error: 'Missing locationId' });
        }

        const { data: customer } = await supabase
            .from('loyalty_customers')
            .select('*')
            .eq('location_id', locationId)
            .eq('contact_id', contactId)
            .single();

        if (!customer) {
            return res.json({
                enrolled: false,
                totalVisits: 0,
                nextReward: null
            });
        }

        // Get next reward milestone
        const { data: nextMilestone } = await supabase
            .from('loyalty_milestones')
            .select('*')
            .eq('location_id', locationId)
            .gt('visit_number', customer.total_visits)
            .order('visit_number', { ascending: true })
            .limit(1);

        res.json({
            enrolled: true,
            totalVisits: customer.total_visits,
            nextReward: nextMilestone && nextMilestone.length > 0 ? {
                name: nextMilestone[0].reward_name,
                requiredVisits: nextMilestone[0].visit_number,
                visitsRemaining: nextMilestone[0].visit_number - customer.total_visits
            } : null
        });
    } catch (error) {
        logger.error('❌ Customer Status Error', { error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
