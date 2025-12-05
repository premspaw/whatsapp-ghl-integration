#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════');
console.log('   Quick .env Setup - Minimal Configuration');
console.log('═══════════════════════════════════════════════════════════\n');

// Check if .env already exists
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env file already exists!');
  console.log('\nOptions:');
  console.log('1. Delete existing .env and run this script again');
  console.log('2. Manually edit the existing .env file');
  console.log('3. Run: node setup-env-interactive.js (for guided setup)\n');
  process.exit(0);
}

// Create minimal .env with defaults
const minimalEnv = `# WhatsApp to GHL Integration - Environment Configuration
# Quick Setup - Edit these values as needed

# ═══════════════════════════════════════════════════════════
# SERVER CONFIGURATION
# ═══════════════════════════════════════════════════════════
PORT=3000
NODE_ENV=development

# ═══════════════════════════════════════════════════════════
# WHATSAPP CONFIGURATION
# ═══════════════════════════════════════════════════════════
WHATSAPP_SESSION_NAME=Mywhatsapp
USE_MOCK_WHATSAPP=true
FILTER_GROUP_MESSAGES=true
FILTER_BROADCAST_MESSAGES=true
FILTER_COMPANY_MESSAGES=true

# ═══════════════════════════════════════════════════════════
# GOHIGHLEVEL API CONFIGURATION (REQUIRED for GHL sync)
# ═══════════════════════════════════════════════════════════
# Get from: GHL Settings → API → Generate API Key
GHL_API_KEY=
GHL_LOCATION_ID=
GHL_BASE_URL=https://services.leadconnectorhq.com
GHL_CHANNEL_MODE=sms

# ═══════════════════════════════════════════════════════════
# DATABASE CONFIGURATION (SUPABASE) - REQUIRED for persistence
# ═══════════════════════════════════════════════════════════
# Get from: https://app.supabase.com → Your Project → Settings → API
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
SUPABASE_SCHEMA=public

# ═══════════════════════════════════════════════════════════
# AI CONFIGURATION (OPTIONAL but recommended)
# ═══════════════════════════════════════════════════════════
# Option 1: OpenRouter (recommended)
# Get from: https://openrouter.ai/keys
OPENROUTER_API_KEY=
OPENROUTER_MODEL=anthropic/claude-3-haiku
OPENROUTER_REFERER=http://localhost:3000

# Option 2: OpenAI (alternative)
# Get from: https://platform.openai.com/api-keys
# OPENAI_API_KEY=

# ═══════════════════════════════════════════════════════════
# SMS CONFIGURATION (OPTIONAL)
# ═══════════════════════════════════════════════════════════
SMS_PROVIDER=twilio
# TWILIO_ACCOUNT_SID=
# TWILIO_AUTH_TOKEN=
# TWILIO_FROM_NUMBER=

# ═══════════════════════════════════════════════════════════
# EMAIL CONFIGURATION (OPTIONAL)
# ═══════════════════════════════════════════════════════════
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_SECURE=false
# EMAIL_USER=
# EMAIL_PASS=
# EMAIL_FROM=
`;

try {
  fs.writeFileSync(envPath, minimalEnv);
  console.log('✅ .env file created successfully!\n');
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   What was created:');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('✅ Basic server configuration (ready to use)');
  console.log('✅ Mock WhatsApp mode enabled (for testing)');
  console.log('⚠️  GHL API credentials (need to be added)');
  console.log('⚠️  Supabase database (need to be added)');
  console.log('⚪ AI, SMS, Email (optional, commented out)\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('   Quick Test (No setup required):');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('You can start the server RIGHT NOW to test:');
  console.log('   npm start');
  console.log('   Open: http://localhost:3000\n');
  console.log('This will run in MOCK mode with test data.\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('   To Add Real Credentials:');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('1️⃣  GOHIGHLEVEL (for contact/message sync):');
  console.log('   • Login to GoHighLevel');
  console.log('   • Go to Settings → API');
  console.log('   • Generate API Key');
  console.log('   • Copy Location ID from dashboard URL');
  console.log('   • Edit .env and add:\n');
  console.log('     GHL_API_KEY=your_key_here');
  console.log('     GHL_LOCATION_ID=your_location_id\n');

  console.log('2️⃣  SUPABASE (for database persistence):');
  console.log('   • Go to https://supabase.com');
  console.log('   • Create new project');
  console.log('   • Go to Settings → API');
  console.log('   • Copy: URL, Service Role Key, Anon Key');
  console.log('   • Edit .env and add credentials');
  console.log('   • Run migrations: data/migrations/*.sql\n');

  console.log('3️⃣  AI PROVIDER (for smart replies):');
  console.log('   • Option A - OpenRouter (recommended):');
  console.log('     - Go to https://openrouter.ai');
  console.log('     - Create account and generate key');
  console.log('     - Add to .env: OPENROUTER_API_KEY=sk-or-v1-...\n');
  console.log('   • Option B - OpenAI:');
  console.log('     - Go to https://platform.openai.com');
  console.log('     - Generate API key');
  console.log('     - Add to .env: OPENAI_API_KEY=sk-...\n');

  console.log('4️⃣  REAL WHATSAPP (when ready):');
  console.log('   • Edit .env: USE_MOCK_WHATSAPP=false');
  console.log('   • Restart server: npm start');
  console.log('   • Scan QR code with WhatsApp mobile app\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('   Useful Commands:');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('Start server:           npm start');
  console.log('Test all features:      node test-complete-flow.js');
  console.log('Interactive setup:      node setup-env-interactive.js');
  console.log('View status:            cat PROJECT_STATUS_SUMMARY.md\n');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('   Need Help?');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('📚 Read: QUICK_CHECKLIST.md');
  console.log('📚 Read: PROJECT_STATUS_SUMMARY.md');
  console.log('📚 Read: QUICK_START.md\n');

} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
  process.exit(1);
}

