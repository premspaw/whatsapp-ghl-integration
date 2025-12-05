const { createClient } = require('@supabase/supabase-js');
const config = require('./env');
const logger = require('../utils/logger');

let supabase = null;

if (config.supabase.url && config.supabase.key) {
    try {
        supabase = createClient(config.supabase.url, config.supabase.key, {
            db: { schema: 'public' },
        });
        logger.info('✅ Supabase client initialized');
    } catch (error) {
        logger.error('❌ Failed to initialize Supabase client', { error: error.message });
    }
} else {
    logger.warn('⚠️ Supabase credentials missing. Database features will be disabled.');
}

module.exports = supabase;
