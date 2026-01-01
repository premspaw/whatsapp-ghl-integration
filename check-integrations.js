const supabase = require('./src/config/supabase');
const logger = require('./src/utils/logger');

async function checkIntegrations() {
    if (!supabase) {
        console.error('Supabase not initialized');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('ghl_integrations')
            .select('location_id, user_type, company_id, updated_at');

        if (error) {
            console.error('Error fetching integrations:', error);
            return;
        }

        console.log('Active GHL Integrations:');
        console.table(data);
    } catch (err) {
        console.error('Exception:', err);
    }
}

checkIntegrations();
