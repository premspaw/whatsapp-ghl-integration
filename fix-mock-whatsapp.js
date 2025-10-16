#!/usr/bin/env node

/**
 * Fix Mock WhatsApp Service Issues
 */

const fs = require('fs');

console.log('🔧 Fixing Mock WhatsApp Service...\n');

// Check if .env file exists and has correct settings
if (!fs.existsSync('.env')) {
  console.log('❌ .env file not found. Creating one...');
  
  const envContent = `# WhatsApp Configuration
WHATSAPP_SESSION_NAME=Mywhatsapp
USE_MOCK_WHATSAPP=true

# GoHighLevel API Configuration
GHL_API_KEY=pit-89789df0-5431-4cc6-9787-8d2423d5d120
GHL_LOCATION_ID=dXh04Cd8ixM9hnk1IS5b
GHL_BASE_URL=https://services.leadconnectorhq.com

# OpenRouter Configuration for AI Replies
OPENROUTER_API_KEY=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
OPENROUTER_MODEL=anthropic/claude-3-haiku
OPENROUTER_REFERER=http://localhost:3000

# Server Configuration
PORT=3000
NODE_ENV=development
`;
  
  fs.writeFileSync('.env', envContent);
  console.log('✅ .env file created with correct settings');
} else {
  // Read and update .env file
  let envContent = fs.readFileSync('.env', 'utf8');
  
  // Ensure USE_MOCK_WHATSAPP is set to true
  if (!envContent.includes('USE_MOCK_WHATSAPP=true')) {
    envContent = envContent.replace(
      /USE_MOCK_WHATSAPP=.*/,
      'USE_MOCK_WHATSAPP=true'
    );
    
    if (!envContent.includes('USE_MOCK_WHATSAPP=')) {
      envContent = 'USE_MOCK_WHATSAPP=true\n' + envContent;
    }
    
    fs.writeFileSync('.env', envContent);
    console.log('✅ Updated .env file to use mock WhatsApp');
  }
}

console.log('🔍 Checking service files...');

// Check if mock WhatsApp service exists
if (fs.existsSync('services/mockWhatsAppService.js')) {
  console.log('✅ Mock WhatsApp service file exists');
} else {
  console.log('❌ Mock WhatsApp service file not found');
}

// Check if main server file exists
if (fs.existsSync('server.js')) {
  console.log('✅ Server file exists');
} else {
  console.log('❌ Server file not found');
}

console.log('\n🚀 Next steps:');
console.log('1. Restart the server: npm start');
console.log('2. Check debug info: curl http://localhost:3000/api/debug/services');
console.log('3. Test mock WhatsApp: curl http://localhost:3000/api/mock/contacts');
console.log('4. Open http://localhost:3000/mock-test.html');

console.log('\n💡 If the error persists:');
console.log('- Check the server console for error messages');
console.log('- Verify all dependencies are installed: npm install');
console.log('- Check the debug endpoint for service status');
