#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('═══════════════════════════════════════════════════════════');
console.log('   WhatsApp to GHL Integration - Environment Setup');
console.log('═══════════════════════════════════════════════════════════\n');

const config = {};

const questions = [
  {
    key: 'PORT',
    question: 'Server Port (default: 3000): ',
    default: '3000',
    required: false
  },
  {
    key: 'NODE_ENV',
    question: 'Environment (development/production) [default: development]: ',
    default: 'development',
    required: false
  },
  {
    key: 'USE_MOCK_WHATSAPP',
    question: 'Use Mock WhatsApp for testing? (true/false) [default: true]: ',
    default: 'true',
    required: false,
    section: '\n📱 WHATSAPP CONFIGURATION'
  },
  {
    key: 'WHATSAPP_SESSION_NAME',
    question: 'WhatsApp Session Name [default: Mywhatsapp]: ',
    default: 'Mywhatsapp',
    required: false
  },
  {
    key: 'FILTER_GROUP_MESSAGES',
    question: 'Filter out group messages? (true/false) [default: true]: ',
    default: 'true',
    required: false
  },
  {
    key: 'FILTER_BROADCAST_MESSAGES',
    question: 'Filter out broadcast messages? (true/false) [default: true]: ',
    default: 'true',
    required: false
  },
  {
    key: 'GHL_API_KEY',
    question: 'GoHighLevel API Key (REQUIRED for GHL sync): ',
    default: '',
    required: false,
    section: '\n🔗 GOHIGHLEVEL CONFIGURATION',
    info: '   Get this from: GHL Settings → API → Generate API Key'
  },
  {
    key: 'GHL_LOCATION_ID',
    question: 'GoHighLevel Location ID (REQUIRED for GHL sync): ',
    default: '',
    required: false,
    info: '   Find this in your GHL dashboard URL'
  },
  {
    key: 'GHL_BASE_URL',
    question: 'GHL API Base URL [default: https://services.leadconnectorhq.com]: ',
    default: 'https://services.leadconnectorhq.com',
    required: false
  },
  {
    key: 'GHL_CHANNEL_MODE',
    question: 'GHL Channel Mode (sms/whatsapp) [default: sms]: ',
    default: 'sms',
    required: false,
    info: '   Use "sms" for most cases, "whatsapp" if GHL has native WhatsApp'
  },
  {
    key: 'SUPABASE_URL',
    question: 'Supabase Project URL (REQUIRED for database): ',
    default: '',
    required: false,
    section: '\n💾 DATABASE CONFIGURATION (SUPABASE)',
    info: '   Get from: https://app.supabase.com → Your Project → Settings → API'
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    question: 'Supabase Service Role Key (REQUIRED for database): ',
    default: '',
    required: false,
    info: '   WARNING: Keep this secret! Server-side only!'
  },
  {
    key: 'SUPABASE_ANON_KEY',
    question: 'Supabase Anon Key (REQUIRED for database): ',
    default: '',
    required: false
  },
  {
    key: 'OPENROUTER_API_KEY',
    question: 'OpenRouter API Key (for AI replies): ',
    default: '',
    required: false,
    section: '\n🤖 AI CONFIGURATION',
    info: '   Get from: https://openrouter.ai/keys'
  },
  {
    key: 'OPENROUTER_MODEL',
    question: 'OpenRouter Model [default: anthropic/claude-3-haiku]: ',
    default: 'anthropic/claude-3-haiku',
    required: false,
    info: '   Options: anthropic/claude-3-haiku, openai/gpt-4, google/gemini-pro'
  },
  {
    key: 'OPENAI_API_KEY',
    question: 'OpenAI API Key (alternative to OpenRouter): ',
    default: '',
    required: false,
    info: '   Get from: https://platform.openai.com/api-keys'
  },
  {
    key: 'TWILIO_ACCOUNT_SID',
    question: 'Twilio Account SID (for SMS support): ',
    default: '',
    required: false,
    section: '\n📞 SMS CONFIGURATION (OPTIONAL)',
    info: '   Get from: https://console.twilio.com'
  },
  {
    key: 'TWILIO_AUTH_TOKEN',
    question: 'Twilio Auth Token: ',
    default: '',
    required: false
  },
  {
    key: 'TWILIO_FROM_NUMBER',
    question: 'Twilio Phone Number (e.g., +1234567890): ',
    default: '',
    required: false
  },
  {
    key: 'EMAIL_HOST',
    question: 'Email SMTP Host [default: smtp.gmail.com]: ',
    default: 'smtp.gmail.com',
    required: false,
    section: '\n📧 EMAIL CONFIGURATION (OPTIONAL)',
    info: '   For notifications and alerts'
  },
  {
    key: 'EMAIL_PORT',
    question: 'Email SMTP Port [default: 587]: ',
    default: '587',
    required: false
  },
  {
    key: 'EMAIL_USER',
    question: 'Email Address: ',
    default: '',
    required: false
  },
  {
    key: 'EMAIL_PASS',
    question: 'Email Password/App Password: ',
    default: '',
    required: false,
    info: '   For Gmail: Use App Password, not regular password'
  }
];

let currentIndex = 0;

function askQuestion() {
  if (currentIndex >= questions.length) {
    generateEnvFile();
    return;
  }

  const q = questions[currentIndex];
  
  // Print section header if exists
  if (q.section) {
    console.log(q.section);
    console.log('─────────────────────────────────────────────────────────');
  }
  
  // Print info if exists
  if (q.info) {
    console.log('\x1b[36m' + q.info + '\x1b[0m');
  }

  rl.question(q.question, (answer) => {
    const value = answer.trim() || q.default;
    
    if (value) {
      config[q.key] = value;
    } else if (q.required) {
      console.log('\x1b[31m⚠️  This field is required!\x1b[0m\n');
      askQuestion(); // Ask again
      return;
    }
    
    currentIndex++;
    askQuestion();
  });
}

function generateEnvFile() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   Generating .env file...');
  console.log('═══════════════════════════════════════════════════════════\n');

  let envContent = '# WhatsApp to GHL Integration - Environment Configuration\n';
  envContent += '# Generated on: ' + new Date().toISOString() + '\n\n';

  // Server Configuration
  envContent += '# ═══════════════════════════════════════════════════════════\n';
  envContent += '# SERVER CONFIGURATION\n';
  envContent += '# ═══════════════════════════════════════════════════════════\n';
  envContent += `PORT=${config.PORT || '3000'}\n`;
  envContent += `NODE_ENV=${config.NODE_ENV || 'development'}\n\n`;

  // WhatsApp Configuration
  envContent += '# ═══════════════════════════════════════════════════════════\n';
  envContent += '# WHATSAPP CONFIGURATION\n';
  envContent += '# ═══════════════════════════════════════════════════════════\n';
  envContent += `WHATSAPP_SESSION_NAME=${config.WHATSAPP_SESSION_NAME || 'Mywhatsapp'}\n`;
  envContent += `USE_MOCK_WHATSAPP=${config.USE_MOCK_WHATSAPP || 'true'}\n`;
  envContent += `FILTER_GROUP_MESSAGES=${config.FILTER_GROUP_MESSAGES || 'true'}\n`;
  envContent += `FILTER_BROADCAST_MESSAGES=${config.FILTER_BROADCAST_MESSAGES || 'true'}\n`;
  envContent += `FILTER_COMPANY_MESSAGES=true\n\n`;

  // GHL Configuration
  envContent += '# ═══════════════════════════════════════════════════════════\n';
  envContent += '# GOHIGHLEVEL API CONFIGURATION\n';
  envContent += '# ═══════════════════════════════════════════════════════════\n';
  if (config.GHL_API_KEY) {
    envContent += `GHL_API_KEY=${config.GHL_API_KEY}\n`;
  } else {
    envContent += '# GHL_API_KEY=your_ghl_api_key_here\n';
  }
  if (config.GHL_LOCATION_ID) {
    envContent += `GHL_LOCATION_ID=${config.GHL_LOCATION_ID}\n`;
  } else {
    envContent += '# GHL_LOCATION_ID=your_ghl_location_id_here\n';
  }
  envContent += `GHL_BASE_URL=${config.GHL_BASE_URL || 'https://services.leadconnectorhq.com'}\n`;
  envContent += `GHL_CHANNEL_MODE=${config.GHL_CHANNEL_MODE || 'sms'}\n\n`;

  // Supabase Configuration
  envContent += '# ═══════════════════════════════════════════════════════════\n';
  envContent += '# DATABASE CONFIGURATION (SUPABASE)\n';
  envContent += '# ═══════════════════════════════════════════════════════════\n';
  if (config.SUPABASE_URL) {
    envContent += `SUPABASE_URL=${config.SUPABASE_URL}\n`;
  } else {
    envContent += '# SUPABASE_URL=your_supabase_url\n';
  }
  if (config.SUPABASE_SERVICE_ROLE_KEY) {
    envContent += `SUPABASE_SERVICE_ROLE_KEY=${config.SUPABASE_SERVICE_ROLE_KEY}\n`;
  } else {
    envContent += '# SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key\n';
  }
  if (config.SUPABASE_ANON_KEY) {
    envContent += `SUPABASE_ANON_KEY=${config.SUPABASE_ANON_KEY}\n`;
  } else {
    envContent += '# SUPABASE_ANON_KEY=your_supabase_anon_key\n';
  }
  envContent += 'SUPABASE_SCHEMA=public\n\n';

  // AI Configuration
  envContent += '# ═══════════════════════════════════════════════════════════\n';
  envContent += '# AI CONFIGURATION\n';
  envContent += '# ═══════════════════════════════════════════════════════════\n';
  if (config.OPENROUTER_API_KEY) {
    envContent += `OPENROUTER_API_KEY=${config.OPENROUTER_API_KEY}\n`;
    envContent += `OPENROUTER_MODEL=${config.OPENROUTER_MODEL || 'anthropic/claude-3-haiku'}\n`;
    envContent += `OPENROUTER_REFERER=${config.OPENROUTER_REFERER || 'http://localhost:3000'}\n`;
  } else {
    envContent += '# OPENROUTER_API_KEY=your_openrouter_api_key_here\n';
    envContent += '# OPENROUTER_MODEL=anthropic/claude-3-haiku\n';
    envContent += '# OPENROUTER_REFERER=http://localhost:3000\n';
  }
  envContent += '\n# Alternative: OpenAI Configuration\n';
  if (config.OPENAI_API_KEY) {
    envContent += `OPENAI_API_KEY=${config.OPENAI_API_KEY}\n\n`;
  } else {
    envContent += '# OPENAI_API_KEY=your_openai_api_key_here\n\n';
  }

  // SMS Configuration
  envContent += '# ═══════════════════════════════════════════════════════════\n';
  envContent += '# SMS CONFIGURATION (OPTIONAL - TWILIO)\n';
  envContent += '# ═══════════════════════════════════════════════════════════\n';
  envContent += 'SMS_PROVIDER=twilio\n';
  if (config.TWILIO_ACCOUNT_SID) {
    envContent += `TWILIO_ACCOUNT_SID=${config.TWILIO_ACCOUNT_SID}\n`;
    envContent += `TWILIO_AUTH_TOKEN=${config.TWILIO_AUTH_TOKEN}\n`;
    envContent += `TWILIO_FROM_NUMBER=${config.TWILIO_FROM_NUMBER}\n\n`;
  } else {
    envContent += '# TWILIO_ACCOUNT_SID=your_twilio_account_sid\n';
    envContent += '# TWILIO_AUTH_TOKEN=your_twilio_auth_token\n';
    envContent += '# TWILIO_FROM_NUMBER=your_twilio_phone_number\n\n';
  }

  // Email Configuration
  envContent += '# ═══════════════════════════════════════════════════════════\n';
  envContent += '# EMAIL CONFIGURATION (OPTIONAL)\n';
  envContent += '# ═══════════════════════════════════════════════════════════\n';
  if (config.EMAIL_USER) {
    envContent += `EMAIL_HOST=${config.EMAIL_HOST || 'smtp.gmail.com'}\n`;
    envContent += `EMAIL_PORT=${config.EMAIL_PORT || '587'}\n`;
    envContent += 'EMAIL_SECURE=false\n';
    envContent += `EMAIL_USER=${config.EMAIL_USER}\n`;
    envContent += `EMAIL_PASS=${config.EMAIL_PASS}\n`;
    envContent += `EMAIL_FROM=${config.EMAIL_USER}\n`;
  } else {
    envContent += '# EMAIL_HOST=smtp.gmail.com\n';
    envContent += '# EMAIL_PORT=587\n';
    envContent += '# EMAIL_SECURE=false\n';
    envContent += '# EMAIL_USER=your_email@gmail.com\n';
    envContent += '# EMAIL_PASS=your_app_password\n';
    envContent += '# EMAIL_FROM=your_email@gmail.com\n';
  }

  // Write to file
  const envPath = path.join(__dirname, '.env');
  
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully!\n');
    
    // Print summary
    printSummary();
    
  } catch (error) {
    console.error('❌ Error creating .env file:', error.message);
  }
  
  rl.close();
}

function printSummary() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   Configuration Summary');
  console.log('═══════════════════════════════════════════════════════════\n');

  const hasGHL = config.GHL_API_KEY && config.GHL_LOCATION_ID;
  const hasDB = config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY;
  const hasAI = config.OPENROUTER_API_KEY || config.OPENAI_API_KEY;
  const hasSMS = config.TWILIO_ACCOUNT_SID;
  const hasEmail = config.EMAIL_USER;

  console.log('✅ Server Configuration: SET');
  console.log(`${config.USE_MOCK_WHATSAPP === 'true' ? '🔵' : '✅'} WhatsApp Mode: ${config.USE_MOCK_WHATSAPP === 'true' ? 'MOCK (Testing)' : 'REAL'}`);
  console.log(`${hasGHL ? '✅' : '⚠️ '} GHL Integration: ${hasGHL ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
  console.log(`${hasDB ? '✅' : '⚠️ '} Database (Supabase): ${hasDB ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
  console.log(`${hasAI ? '✅' : '⚠️ '} AI Replies: ${hasAI ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
  console.log(`${hasSMS ? '✅' : '⚪'} SMS Support: ${hasSMS ? 'CONFIGURED' : 'NOT CONFIGURED (Optional)'}`);
  console.log(`${hasEmail ? '✅' : '⚪'} Email Notifications: ${hasEmail ? 'CONFIGURED' : 'NOT CONFIGURED (Optional)'}`);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   Next Steps');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (!hasDB) {
    console.log('📋 TODO: Set up Supabase Database');
    console.log('   1. Go to https://supabase.com');
    console.log('   2. Create new project');
    console.log('   3. Run migrations from data/migrations/*.sql');
    console.log('   4. Add credentials to .env\n');
  }

  if (!hasGHL) {
    console.log('📋 TODO: Configure GoHighLevel');
    console.log('   1. Login to GoHighLevel');
    console.log('   2. Go to Settings → API');
    console.log('   3. Generate API Key');
    console.log('   4. Add to .env file\n');
  }

  if (!hasAI) {
    console.log('📋 TODO: Enable AI Replies (Optional)');
    console.log('   1. Go to https://openrouter.ai (recommended)');
    console.log('      OR https://platform.openai.com');
    console.log('   2. Generate API Key');
    console.log('   3. Add to .env file\n');
  }

  console.log('🚀 Ready to start:');
  console.log('   npm start\n');

  console.log('📚 Documentation:');
  console.log('   See QUICK_CHECKLIST.md for detailed setup');
  console.log('   See PROJECT_STATUS_SUMMARY.md for complete overview\n');

  console.log('═══════════════════════════════════════════════════════════\n');
}

// Start the setup
console.log('This wizard will help you create your .env file.\n');
console.log('💡 TIP: Press Enter to use default values');
console.log('💡 TIP: Leave optional fields empty to skip them\n');

askQuestion();

