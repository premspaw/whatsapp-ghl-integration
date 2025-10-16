#!/usr/bin/env node

/**
 * Restart with all fixes applied
 */

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🔄 Restarting server with all fixes...\n');

// Check if .env file exists and is properly configured
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
  console.log('✅ .env file created');
} else {
  console.log('✅ .env file exists');
}

// Check if all required files exist
const requiredFiles = [
  'server.js',
  'services/mockWhatsAppService.js',
  'services/ghlService.js',
  'services/aiService.js',
  'services/conversationManager.js',
  'public/index.html',
  'public/mock-test.html'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} not found`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing. Please check the installation.');
  process.exit(1);
}

console.log('\n🚀 Starting server with fixes...');
console.log('📱 Mock WhatsApp: Enabled');
console.log('🤖 AI Service: OpenRouter');
console.log('🔗 GHL Integration: Configured');
console.log('');

// Start the server
const server = spawn('node', ['server.js'], {
  stdio: 'inherit',
  shell: true
});

server.on('error', (error) => {
  console.error('❌ Error starting server:', error);
});

server.on('close', (code) => {
  console.log(`\n🔄 Server stopped with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping server...');
  server.kill('SIGINT');
  process.exit(0);
});

console.log('✅ Server started successfully!');
console.log('🌐 Open http://localhost:3000');
console.log('🧪 Test interface: http://localhost:3000/mock-test.html');
console.log('🔍 Debug info: http://localhost:3000/api/debug/services');
console.log('🧪 Mock test: http://localhost:3000/api/mock/test');
console.log('\nPress Ctrl+C to stop the server');
