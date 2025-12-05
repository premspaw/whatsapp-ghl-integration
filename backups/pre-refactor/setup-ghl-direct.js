#!/usr/bin/env node

/**
 * Direct GHL API Setup (No Marketplace App Needed)
 * This is for personal/private use with your own GHL sub-account
 */

const fs = require('fs');

console.log('🔗 Setting up Direct GHL API Integration...\n');
console.log('📋 This setup is for your own GHL sub-account (no marketplace app needed)\n');

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.log('❌ .env file not found. Please run: npm run setup-openrouter');
  process.exit(1);
}

console.log('🎯 What you need from your GHL sub-account:');
console.log('');
console.log('1. API Key:');
console.log('   - Go to your GHL sub-account');
console.log('   - Settings → API Keys → Create API Key');
console.log('   - Copy the API key (starts with sk_...)');
console.log('');
console.log('2. Location ID:');
console.log('   - Go to Settings → Company Settings');
console.log('   - Find your Location ID (long number)');
console.log('   - Copy this Location ID');
console.log('');

// If running with command line arguments or use provided credentials
if (process.argv.length >= 4) {
  const apiKey = process.argv[2];
  const locationId = process.argv[3];
} else {
  // Use the provided credentials
  const apiKey = 'pit-89789df0-5431-4cc6-9787-8d2423d5d120';
  const locationId = 'dXh04Cd8ixM9hnk1IS5b';
  
  // Read current .env file
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
  
  console.log('✅ GHL credentials configured!');
  console.log('🔑 API Key:', apiKey.substring(0, 10) + '...');
  console.log('📍 Location ID:', locationId);
  console.log('');
  console.log('🚀 Next steps:');
  console.log('1. Start the application: npm start');
  console.log('2. Test GHL connection: npm run test-mock');
  console.log('3. Check GHL status in web interface');
  console.log('');
  console.log('💡 Your WhatsApp conversations will now sync to GHL!');
} else {
  console.log('📝 To configure GHL, run:');
  console.log('npm run setup-ghl-direct YOUR_API_KEY YOUR_LOCATION_ID');
  console.log('');
  console.log('Example:');
  console.log('npm run setup-ghl-direct sk_1234567890abcdef 123456789');
  console.log('');
  console.log('🔍 Where to find these in your GHL sub-account:');
  console.log('   - API Key: Settings → API Keys → Create API Key');
  console.log('   - Location ID: Settings → Company Settings');
  console.log('');
  console.log('❓ Don\'t have a GHL sub-account?');
  console.log('   - You can use the system without GHL (AI replies will still work)');
  console.log('   - Set GHL_API_KEY=disabled in .env to skip GHL integration');
}
