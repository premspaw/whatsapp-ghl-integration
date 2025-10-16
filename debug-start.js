#!/usr/bin/env node

/**
 * Debug startup script to identify issues
 */

console.log('🔍 Debugging WhatsApp to GHL Integration...\n');

// Check Node.js version
console.log('1. Node.js version:', process.version);

// Check if .env file exists
const fs = require('fs');
const path = require('path');

console.log('2. Checking environment file...');
if (fs.existsSync('.env')) {
  console.log('✅ .env file exists');
} else {
  console.log('❌ .env file not found - creating from template...');
  if (fs.existsSync('env.example')) {
    fs.copyFileSync('env.example', '.env');
    console.log('✅ .env file created from template');
  } else {
    console.log('❌ env.example not found');
  }
}

// Check dependencies
console.log('\n3. Checking dependencies...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const dependencies = Object.keys(packageJson.dependencies || {});

console.log('Required dependencies:');
dependencies.forEach(dep => {
  try {
    require(dep);
    console.log(`✅ ${dep}`);
  } catch (error) {
    console.log(`❌ ${dep} - ${error.message}`);
  }
});

// Check if node_modules exists
console.log('\n4. Checking node_modules...');
if (fs.existsSync('node_modules')) {
  console.log('✅ node_modules directory exists');
} else {
  console.log('❌ node_modules not found - run: npm install');
}

// Check services
console.log('\n5. Checking services...');
const services = [
  'services/whatsappService.js',
  'services/mockWhatsAppService.js',
  'services/ghlService.js',
  'services/aiService.js',
  'services/conversationManager.js',
  'services/smsService.js',
  'services/emailService.js'
];

services.forEach(service => {
  if (fs.existsSync(service)) {
    console.log(`✅ ${service}`);
  } else {
    console.log(`❌ ${service} not found`);
  }
});

// Check public directory
console.log('\n6. Checking public files...');
const publicFiles = [
  'public/index.html',
  'public/js/app.js',
  'public/mock-test.html'
];

publicFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} not found`);
  }
});

console.log('\n7. Environment variables:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('PORT:', process.env.PORT || 'undefined');
console.log('USE_MOCK_WHATSAPP:', process.env.USE_MOCK_WHATSAPP || 'undefined');

console.log('\n🎯 Next steps:');
console.log('1. If any dependencies are missing, run: npm install');
console.log('2. If .env file is missing, it has been created from template');
console.log('3. Try starting the server: npm start');
console.log('4. If it still crashes, check the error messages above');

console.log('\n📱 For mock testing, ensure USE_MOCK_WHATSAPP=true in .env file');
console.log('🔧 For real WhatsApp, set USE_MOCK_WHATSAPP=false and configure API keys');
