const fs = require('fs');
const path = require('path');

// Clear conversation history for test phone number
const conversationsPath = path.join(__dirname, 'data', 'conversations.json');
const testPhone = '+918123133382';

try {
  const conversations = JSON.parse(fs.readFileSync(conversationsPath, 'utf8'));
  
  if (conversations[testPhone]) {
    console.log(`🗑️ Clearing conversation history for ${testPhone}`);
    delete conversations[testPhone];
    
    fs.writeFileSync(conversationsPath, JSON.stringify(conversations, null, 2));
    console.log('✅ Conversation history cleared');
  } else {
    console.log(`ℹ️ No conversation history found for ${testPhone}`);
  }
} catch (error) {
  console.error('Error clearing conversation:', error);
}