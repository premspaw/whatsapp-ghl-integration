const { createClient } = require('@supabase/supabase-js');

let cachedClient = null;

function getSupabase() {
  try {
    if (cachedClient) return cachedClient;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    cachedClient = createClient(url, key, {
      db: { schema: process.env.SUPABASE_SCHEMA || 'public' }
    });
    return cachedClient;
  } catch (e) {
    return null;
  }
}

module.exports = { getSupabase };


