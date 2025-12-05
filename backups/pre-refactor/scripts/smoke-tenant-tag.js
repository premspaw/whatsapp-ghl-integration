#!/usr/bin/env node

// Simple smoke test to validate tag-based tenant resolution
const TenantService = require('../services/tenantService');

async function main() {
  // Provide dummy Supabase env to satisfy client init
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://dummy.supabase.co';
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'dummy-key';
  const svc = new TenantService();
  const sample = {
    phone: '+918123133382',
    locationId: null,
    tags: ['Location:SYNTHCORE', 'VIP']
  };
  const tenantId = await svc.resolveTenantId(sample);
  console.log('SMOKE: input tags', sample.tags);
  console.log('SMOKE: resolved tenantId', tenantId);
}

main().catch(err => {
  console.error('SMOKE: error', err.message);
  process.exit(1);
});