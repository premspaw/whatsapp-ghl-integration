#!/usr/bin/env node

console.log('═══════════════════════════════════════════════════════════');
console.log('   Testing Server Startup');
console.log('═══════════════════════════════════════════════════════════\n');

require('dotenv').config();

console.log('✅ dotenv loaded\n');

console.log('Checking environment variables:');
console.log('  PORT:', process.env.PORT || '❌ Not set');
console.log('  NODE_ENV:', process.env.NODE_ENV || '❌ Not set');
console.log('  GHL_API_KEY:', process.env.GHL_API_KEY ? '✅ Set' : '❌ Not set');
console.log('  GHL_LOCATION_ID:', process.env.GHL_LOCATION_ID ? '✅ Set' : '❌ Not set');
console.log('  SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Not set');
console.log('  SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Not set');
console.log('  OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? '✅ Set' : '❌ Not set');
console.log('');

console.log('Testing Supabase connection:');
try {
  const { createClient } = require('@supabase/supabase-js');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('❌ Supabase credentials not configured');
  } else {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { db: { schema: process.env.SUPABASE_SCHEMA || 'public' } }
    );
    console.log('✅ Supabase client created');
    
    // Test connection
    supabase.from('contacts').select('*').limit(1).then(({ data, error }) => {
      if (error) {
        console.log('⚠️  Database query test:', error.message);
      } else {
        console.log('✅ Database connection successful!');
      }
      
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('   Starting Main Server');
      console.log('═══════════════════════════════════════════════════════════\n');
      
      // Now start the actual server
      try {
        require('./server.js');
      } catch (err) {
        console.error('❌ Server startup error:', err.message);
        console.error('\nStack trace:', err.stack);
        process.exit(1);
      }
    });
  }
} catch (err) {
  console.error('❌ Error:', err.message);
  console.error('\nStack trace:', err.stack);
  process.exit(1);
}

