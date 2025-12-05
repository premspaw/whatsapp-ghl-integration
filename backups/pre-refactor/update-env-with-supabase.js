#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════');
console.log('   Updating .env with Supabase Credentials');
console.log('═══════════════════════════════════════════════════════════\n');

const SUPABASE_CONFIG = `
# ═══════════════════════════════════════════════════════════
# SUPABASE CONFIGURATION
# ═══════════════════════════════════════════════════════════
SUPABASE_URL=https://sroctkdugjdsaberrlkf.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb2N0a2R1Z2pkc2FiZXJybGtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjU1MzksImV4cCI6MjA3MzM0MTUzOX0.f04DyTsi2ByVaQ_L44Wa_IJOadnqjDV9n66n3Cd3jEg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyb2N0a2R1Z2pkc2FiZXJybGtmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NTUzOSwiZXhwIjoyMDczMzQxNTM5fQ.he0hR0LDbMc3GNDWYoYPWalMe1fVsfRLbZTm2G0GAnc
SUPABASE_SCHEMA=public
`;

const OPTIONAL_CONFIG = `
# WhatsApp Message Filtering
FILTER_GROUP_MESSAGES=true
FILTER_BROADCAST_MESSAGES=true
FILTER_COMPANY_MESSAGES=true
`;

const envPath = path.join(__dirname, '.env');

try {
  // Read existing .env
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Create backup
  const backupPath = envPath + '.backup-' + Date.now();
  fs.writeFileSync(backupPath, envContent);
  console.log(`✅ Backup created: ${path.basename(backupPath)}\n`);
  
  // Check if Supabase config already exists
  if (envContent.includes('SUPABASE_URL')) {
    console.log('⚠️  Supabase configuration already exists in .env');
    console.log('   Updating with new values...\n');
    
    // Remove old Supabase config
    const lines = envContent.split('\n');
    const filtered = lines.filter(line => !line.includes('SUPABASE_'));
    envContent = filtered.join('\n');
  }
  
  // Find insertion point (after NODE_ENV)
  const lines = envContent.split('\n');
  let insertIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('NODE_ENV=')) {
      insertIndex = i + 1;
      break;
    }
  }
  
  if (insertIndex === -1) {
    // If NODE_ENV not found, add at the end
    envContent += SUPABASE_CONFIG;
  } else {
    // Insert after NODE_ENV
    lines.splice(insertIndex, 0, SUPABASE_CONFIG);
    envContent = lines.join('\n');
  }
  
  // Also add optional filtering config if not exists
  if (!envContent.includes('FILTER_GROUP_MESSAGES')) {
    // Find insertion point after USE_MOCK_WHATSAPP
    const lines2 = envContent.split('\n');
    for (let i = 0; i < lines2.length; i++) {
      if (lines2[i].includes('USE_MOCK_WHATSAPP=')) {
        lines2.splice(i + 1, 0, OPTIONAL_CONFIG);
        envContent = lines2.join('\n');
        break;
      }
    }
  }
  
  // Add GHL_CHANNEL_MODE if not exists
  if (!envContent.includes('GHL_CHANNEL_MODE')) {
    const lines3 = envContent.split('\n');
    for (let i = 0; i < lines3.length; i++) {
      if (lines3[i].includes('GHL_BASE_URL=')) {
        lines3.splice(i + 1, 0, 'GHL_CHANNEL_MODE=sms');
        envContent = lines3.join('\n');
        break;
      }
    }
  }
  
  // Write updated .env
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ .env file updated successfully!\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   Added Configuration:');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('✅ SUPABASE_URL');
  console.log('✅ SUPABASE_ANON_KEY');
  console.log('✅ SUPABASE_SERVICE_ROLE_KEY');
  console.log('✅ SUPABASE_SCHEMA');
  console.log('✅ FILTER_GROUP_MESSAGES');
  console.log('✅ FILTER_BROADCAST_MESSAGES');
  console.log('✅ FILTER_COMPANY_MESSAGES');
  console.log('✅ GHL_CHANNEL_MODE\n');
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   Next Steps:');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('1. Run database migrations:');
  console.log('   node run-supabase-migrations.js\n');
  console.log('2. Start the server:');
  console.log('   npm start\n');
  console.log('3. Test database connection:');
  console.log('   curl http://localhost:3000/api/db/status\n');
  
} catch (error) {
  console.error('❌ Error updating .env:', error.message);
  console.log('\n💡 Manual update required:');
  console.log('\nAdd these lines to your .env file:\n');
  console.log(SUPABASE_CONFIG);
  process.exit(1);
}

