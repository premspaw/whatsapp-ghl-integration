const GHLService = require('./services/ghlService');
const ConversationManager = require('./services/conversationManager');
require('dotenv').config();

async function addTestMessage() {
  console.log('📨 Adding test message to GHL conversation\n');
  
  const ghlService = new GHLService();
  const conversationManager = new ConversationManager();
  
  try {
    const testPhone = '+919876543210';
    const contactId = '85wGgV7Rjun1e3SkvUhI';
    const conversationId = 'xtTApslkThBQsfgDXnqd';
    
    console.log('1️⃣ Adding inbound message to GHL...');
    
    // Add an inbound message (from customer)
    const inboundResult = await ghlService.addInboundMessage(contactId, {
      message: 'Hello! I need help with my order. Can you please assist me?',
      type: 'text'
    }, conversationId);
    
    console.log('✅ Inbound message added:', inboundResult);
    
    console.log('\n2️⃣ Adding outbound message to GHL...');
    
    // Add an outbound message (from business)
    const outboundResult = await ghlService.addOutboundMessage(contactId, {
      message: 'Hi! Thank you for reaching out. I\'d be happy to help you with your order. Could you please provide your order number?',
      type: 'text'
    }, conversationId);
    
    console.log('✅ Outbound message added:', outboundResult);
    
    console.log('\n3️⃣ Retrieving conversation messages from GHL...');
    
    // Get all messages from the conversation
    const messages = await ghlService.getConversationMessages(conversationId);
    console.log(`✅ Found ${messages.length} messages in GHL conversation`);
    
    if (messages.length > 0) {
      console.log('\n📨 Messages in GHL conversation:');
      messages.forEach((msg, index) => {
        const timestamp = new Date(msg.dateAdded || msg.timestamp).toLocaleString();
        console.log(`   ${index + 1}. [${msg.direction || 'unknown'}] (${timestamp})`);
        console.log(`      ${msg.message || msg.body || 'No message content'}`);
        console.log('');
      });
    }
    
    console.log('\n🎉 Messages added successfully!');
    console.log('\n📋 Check your GHL dashboard now:');
    console.log('1. Go to your GHL dashboard');
    console.log('2. Navigate to Contacts');
    console.log(`3. Find contact: ${testPhone}`);
    console.log('4. Click on the contact');
    console.log('5. Go to Conversations tab');
    console.log('6. You should see the WhatsApp conversation with messages!');
    
  } catch (error) {
    console.error('❌ Error adding messages:', error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the function
addTestMessage().catch(console.error);
