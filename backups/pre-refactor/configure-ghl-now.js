#!/usr/bin/env node

/**
 * Configure GHL with provided credentials
 */

const fs = require('fs');

console.log('🔗 Configuring GHL with your credentials...\n');

// Your GHL credentials
const apiKey = 'pit-89789df0-5431-4cc6-9787-8d2423d5d120';
const locationId = 'dXh04Cd8ixM9hnk1IS5b';

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.log('❌ .env file not found. Creating one...');
  
  // Create basic .env file first
  const basicEnv = `# WhatsApp Configuration
WHATSAPP_SESSION_NAME=Mywhatsapp
USE_MOCK_WHATSAPP=true

# GoHighLevel API Configuration
GHL_API_KEY=${apiKey}
GHL_LOCATION_ID=${locationId}
GHL_BASE_URL=https://services.leadconnectorhq.com

# OpenRouter Configuration for AI Replies
OPENROUTER_API_KEY=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
OPENROUTER_MODEL=anthropic/claude-3-haiku
OPENROUTER_REFERER=http://localhost:3000

# Server Configuration
PORT=3000
NODE_ENV=development
`;
  
  fs.writeFileSync('.env', basicEnv);
  console.log('✅ .env file created!');
} else {
  // Update existing .env file
  let envContent = fs.readFileSync('.env', 'utf8');
  
  // Update GHL API key
  envContent = envContent.replace(
    /GHL_API_KEY=.*/,
    `GHL_API_KEY=${apiKey}`
  );
  
  // Update GHL Location ID
  envContent = envContent.replace(
    /GHL_LOCATION_ID=.*/,
    `GHL_LOCATION_ID=${locationId}`
  );
  
  // Write updated .env file
  fs.writeFileSync('.env', envContent);
  console.log('✅ .env file updated!');
}

console.log('🔑 API Key configured:', apiKey.substring(0, 10) + '...');
console.log('📍 Location ID configured:', locationId);
console.log('');
console.log('🎉 GHL integration is now configured!');
console.log('');
console.log('🚀 Next steps:');
console.log('1. Start the application: npm start');
console.log('2. Test the complete system: npm run test-mock');
console.log('3. Open http://localhost:3000 to see the interface');
console.log('4. Open http://localhost:3000/mock-test.html for testing');
console.log('');
console.log('💡 Your WhatsApp conversations will now sync to GHL automatically!');
console.log('🤖 AI replies are configured with OpenRouter');
console.log('📱 Mock WhatsApp is ready for testing');
