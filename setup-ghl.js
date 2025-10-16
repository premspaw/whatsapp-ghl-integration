#!/usr/bin/env node

/**
 * GoHighLevel (GHL) Setup Script
 */

const fs = require('fs');

console.log('🔗 Setting up GoHighLevel (GHL) integration...\n');

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.log('❌ .env file not found. Please run: npm run setup-openrouter');
  process.exit(1);
}

console.log('📋 Please provide your GHL credentials:');
console.log('');

// Read current .env file
let envContent = fs.readFileSync('.env', 'utf8');

// Function to update .env file
function updateEnvFile(apiKey, locationId) {
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
  
  console.log('✅ GHL credentials updated in .env file!');
  console.log('🔑 API Key:', apiKey.substring(0, 10) + '...');
  console.log('📍 Location ID:', locationId);
}

// If running with command line arguments
if (process.argv.length >= 4) {
  const apiKey = process.argv[2];
  const locationId = process.argv[3];
  
  updateEnvFile(apiKey, locationId);
  
  console.log('\n🚀 Next steps:');
  console.log('1. Start the application: npm start');
  console.log('2. Test GHL connection: npm run test-mock');
  console.log('3. Check GHL status in the web interface');
} else {
  console.log('📝 To configure GHL, run:');
  console.log('npm run setup-ghl YOUR_API_KEY YOUR_LOCATION_ID');
  console.log('');
  console.log('Example:');
  console.log('npm run setup-ghl sk_1234567890abcdef 123456789');
  console.log('');
  console.log('💡 You can find these credentials in your GHL account:');
  console.log('   - API Key: Settings → API Keys');
  console.log('   - Location ID: Settings → Company Settings');
}
