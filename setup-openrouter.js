#!/usr/bin/env node

/**
 * Quick setup script for OpenRouter API key
 */

const fs = require('fs');

console.log('🔧 Setting up OpenRouter API key...\n');

const apiKey = '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';

// Create .env file with your API key
const envContent = `# WhatsApp Configuration
WHATSAPP_SESSION_NAME=Mywhatsapp
USE_MOCK_WHATSAPP=true

# GoHighLevel API Configuration
GHL_API_KEY=your_ghl_api_key_here
GHL_LOCATION_ID=your_ghl_location_id_here
GHL_BASE_URL=https://services.leadconnectorhq.com

# OpenRouter Configuration for AI Replies
OPENROUTER_API_KEY=${apiKey}
OPENROUTER_MODEL=anthropic/claude-3-haiku
OPENROUTER_REFERER=http://localhost:3000

# Alternative: OpenAI Configuration (if not using OpenRouter)
# OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development

# Database (Optional - for conversation storage)
DATABASE_URL=sqlite:./conversations.db

# SMS Configuration (Optional)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=your_twilio_phone_number

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com
`;

try {
  fs.writeFileSync('.env', envContent);
  console.log('✅ .env file created with your OpenRouter API key!');
  console.log('🔑 API Key configured:', apiKey.substring(0, 20) + '...');
  console.log('🤖 Default model: anthropic/claude-3-haiku');
  console.log('');
  console.log('🚀 Next steps:');
  console.log('1. Make sure you have credits in your OpenRouter account');
  console.log('2. Start the application: npm start');
  console.log('3. Test the AI integration with mock WhatsApp');
  console.log('4. Open http://localhost:3000/mock-test.html for testing');
  console.log('');
  console.log('💡 Your OpenRouter API key is now configured and ready to use!');
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
  console.log('Please create the .env file manually with your API key.');
}
