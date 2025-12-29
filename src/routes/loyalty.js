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
 * @route POST /api/v1/loyalty/ghl-stamp
 * @desc Specific webhook for GHL Workflows to "Stamp" a user
 * Supports GHL default keys: contact_id, location_id, etc.
 */
router.post('/ghl-stamp', async (req, res) => {
    try {
        if (!supabase) return res.status(503).json({ error: 'Database not available' });

        const {
            locationId, location_id,
            contactId, contact_id,
            phone, contact_phone
        } = req.body;

        const finalLocationId = locationId || location_id;
        const finalContactId = contactId || contact_id;
        const finalPhone = phone || contact_phone;

        if (!finalLocationId || (!finalContactId && !finalPhone)) {
            logger.warn('⚠️ GHL Stamp Failed: Missing IDs', { body: req.body });
            return res.status(400).json({ error: 'Missing locationId and (contactId or phone)' });
        }

        logger.info('🎯 GHL Triggered Stamp', { finalLocationId, finalContactId, finalPhone });

        // 1. Find or Create Customer
        let query = supabase.from('loyalty_customers').select('*').eq('location_id', finalLocationId);

        if (finalContactId) {
            query = query.eq('contact_id', finalContactId);
        } else {
            // Fallback to phone if contactId is missing (less reliable but useful)
            // Note: This assumes phone is stored in metadata or a separate column if we want robust phone support
            // For now, we prioritize contact_Id as it's the standard GHL primary key
            return res.status(400).json({ error: 'contact_id is required for reliable GHL integration' });
        }

        const { data: customer, error: customerError } = await query.single();

        let totalVisits = 1;
        let customerId = null;

        if (customer) {
            customerId = customer.id;
            totalVisits = (customer.total_visits || 0) + 1;
            await supabase
                .from('loyalty_customers')
                .update({ total_visits: totalVisits, updated_at: new Date() })
                .eq('id', customer.id);
        } else {
            // Create new customer
            const { data: newCust, error: createError } = await supabase
                .from('loyalty_customers')
                .insert([{
                    location_id: finalLocationId,
                    contact_id: finalContactId,
                    total_visits: 1
                }])
                .select();

            if (createError) throw createError;
            customerId = newCust[0].id;
        }

        // 2. Log Visit History
        await supabase
            .from('loyalty_visits')
            .insert([{
                location_id: finalLocationId,
                contact_id: finalContactId,
                metadata: {
                    source: 'ghl_workflow',
                    payload: req.body,
                    timestamp: new Date().toISOString()
                }
            }]);

        res.json({
            success: true,
            message: 'Stamp added successfully',
            totalVisits,
            contactId: finalContactId
        });

    } catch (error) {
        logger.error('❌ GHL Stamp Error', { error: error.message });
        res.status(500).json({ error: 'Internal server error', details: error.message });
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

        // Check skin_analyses
        const { count: analysisCount, error: analysisError } = await supabase.from('skin_analyses').select('*', { count: 'exact', head: true });
        results.skin_analyses = { status: analysisError ? 'error' : 'ok', count: analysisCount, message: analysisError?.message };

        res.json({
            status: 'Diagnostic Report',
            timestamp: new Date().toISOString(),
            results
        });
    } catch (error) {
        res.status(500).json({ status: 'crash', message: error.message });
    }
});

/**
 * @route POST /api/v1/loyalty/analysis
 * @desc Save a new skin analysis result
 */
router.post('/analysis', async (req, res) => {
    try {
        if (!supabase) return res.status(503).json({ error: 'Database not available' });

        const { locationId, contactId, analysisData, imageUrl } = req.body;

        if (!locationId || !contactId || !analysisData) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data, error } = await supabase
            .from('skin_analyses')
            .insert([{
                location_id: locationId,
                contact_id: contactId,
                analysis_data: analysisData,
                image_url: imageUrl
            }])
            .select();

        if (error) throw error;

        res.json({ success: true, data: data[0] });
    } catch (error) {
        logger.error('❌ Save Analysis Error', { error: error.message });
        res.status(500).json({ error: 'Failed to save analysis', details: error.message });
    }
});

/**
 * @route GET /api/v1/loyalty/analysis/:locationId/:contactId
 * @desc Get skin analysis history for a customer
 */
router.get('/analysis/:locationId/:contactId', async (req, res) => {
    try {
        if (!supabase) return res.status(503).json({ error: 'Database not available' });

        const { locationId, contactId } = req.params;

        const { data, error } = await supabase
            .from('skin_analyses')
            .select('*')
            .eq('location_id', locationId)
            .eq('contact_id', contactId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, history: data });
    } catch (error) {
        logger.error('❌ Fetch Analysis History Error', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch analysis history' });
    }
});

module.exports = router;
