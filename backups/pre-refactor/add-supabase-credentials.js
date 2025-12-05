#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════');
console.log('   Adding Supabase Credentials to .env');
console.log('═══════════════════════════════════════════════════════════\n');

// Your Supabase credentials
const SUPABASE_URL = 'https://sroctkdugjdsaberrlkf.supabase.co';

// Note: Please verify these JWT tokens are complete
// JWT tokens should have 3 parts separated by dots (xxx.yyy.zzz)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb2N0a2R1Z2pkc2FiZXJybGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjU1MzksImV4cCI6MjA3MzM0MTUzOX0.f04DyTsi2ByVaQ_L44Wa_IJOadnqjDV9n66n3Cd3jEg';

// ⚠️ IMPORTANT: The service_role key provided seems incomplete
// Please copy the FULL service_role key from Supabase dashboard
const SUPABASE_SERVICE_ROLE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE';

const envPath = path.join(__dirname, '.env');

try {
  // Read existing .env file
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  console.log('📄 Current .env file loaded\n');
  
  // Check if Supabase section already exists
  if (envContent.includes('SUPABASE_URL')) {
    console.log('⚠️  Supabase configuration already exists in .env\n');
    console.log('Please manually update these lines in your .env file:\n');
  } else {
    console.log('✅ Adding Supabase configuration...\n');
  }
  
  // Display what to add
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Add these lines to your .env file:');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const supabaseConfig = `
# ═══════════════════════════════════════════════════════════
# SUPABASE CONFIGURATION
# ═══════════════════════════════════════════════════════════
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
SUPABASE_SCHEMA=public
`;
  
  console.log(supabaseConfig);
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('⚠️  ACTION REQUIRED:');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('1. Open Supabase Dashboard: https://app.supabase.com');
  console.log('2. Go to: Settings → API');
  console.log('3. Copy the FULL "service_role" key (secret)');
  console.log('   - It should be a long JWT token with 3 parts (xxx.yyy.zzz)');
  console.log('   - Usually starts with: eyJhbGciOiJIUzI1NiIsInR5cCI6...');
  console.log('4. Replace YOUR_SERVICE_ROLE_KEY_HERE with the full key\n');
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Or manually add to .env file:');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('1. Open: .env');
  console.log('2. Add after NODE_ENV line:');
  console.log('3. Paste the configuration above');
  console.log('4. Save file\n');
  
  // Try to append if not exists
  if (!envContent.includes('SUPABASE_URL')) {
    // Add Supabase config after NODE_ENV
    const envLines = envContent.split('\n');
    let insertIndex = -1;
    
    for (let i = 0; i < envLines.length; i++) {
      if (envLines[i].includes('NODE_ENV')) {
        insertIndex = i + 1;
        break;
      }
    }
    
    if (insertIndex > -1) {
      envLines.splice(insertIndex, 0, supabaseConfig);
      const newEnvContent = envLines.join('\n');
      
      // Create backup
      fs.writeFileSync(envPath + '.backup', envContent);
      console.log('✅ Backup created: .env.backup\n');
      
      // Write new content
      fs.writeFileSync(envPath, newEnvContent);
      console.log('✅ .env file updated!\n');
      console.log('⚠️  Still need to add service_role key manually\n');
    }
  }
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Next Steps:');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('1. ✅ Update .env with complete service_role key');
  console.log('2. ⏩ Run database migrations (next step)');
  console.log('3. 🚀 Start server: npm start\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\nManually add these to your .env file:\n');
  console.log(`SUPABASE_URL=${SUPABASE_URL}`);
  console.log(`SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY=<get_from_supabase_dashboard>`);
  console.log(`SUPABASE_SCHEMA=public`);
}

console.log('═══════════════════════════════════════════════════════════\n');

