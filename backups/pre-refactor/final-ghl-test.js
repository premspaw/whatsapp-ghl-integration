const GHLService = require('./services/ghlService');
const ConversationManager = require('./services/conversationManager');
require('dotenv').config();

async function finalGHLTest() {
  console.log('🎯 Final GHL Integration Test\n');
  
  const ghlService = new GHLService();
  const conversationManager = new ConversationManager();
  
  try {
    // Test 1: Create a new conversation with real phone number
    const testPhone = '+919876543211'; // Different phone number
    console.log(`1️⃣ Creating new conversation for ${testPhone}`);
    
    const testMessage = {
      id: { _serialized: `final_test_${Date.now()}` },
      from: testPhone,
      body: 'Hello! This is a test message for the final GHL integration.',
      timestamp: Date.now(),
      type: 'text'
    };
    
    const conversation = await conversationManager.addMessage(testMessage);
    console.log('✅ Conversation created:', conversation.id);
    
    // Enable GHL sync
    await conversationManager.toggleGHLSync(conversation.id, true);
    console.log('✅ GHL sync enabled');
    
    // Sync to GHL
    console.log('\n2️⃣ Syncing conversation to GHL...');
    const syncResult = await ghlService.syncConversation(conversation);
    
    if (syncResult && syncResult.contact && syncResult.conversation) {
      console.log('✅ Conversation synced to GHL!');
      console.log('📞 Contact ID:', syncResult.contact.id);
      console.log('💬 Conversation ID:', syncResult.conversation.id);
      
      // Add a test message
      console.log('\n3️⃣ Adding test messages to GHL...');
      
      // Add inbound message (from customer)
      const inboundResult = await ghlService.addInboundMessage(
        syncResult.contact.id, 
        { message: 'Hello! I need help with my order. Can you please assist me?' },
        syncResult.conversation.id
      );
      console.log('✅ Inbound message added:', inboundResult.messageId);
      
      // Add outbound message (from business)
      const outboundResult = await ghlService.addOutboundMessage(
        syncResult.contact.id,
        { message: 'Hi! Thank you for reaching out. I\'d be happy to help you with your order. Could you please provide your order number?' },
        syncResult.conversation.id
      );
      console.log('✅ Outbound message added:', outboundResult.messageId);
      
      // Add another inbound message
      const inboundResult2 = await ghlService.addInboundMessage(
        syncResult.contact.id,
        { message: 'My order number is #12345. I haven\'t received it yet.' },
        syncResult.conversation.id
      );
      console.log('✅ Second inbound message added:', inboundResult2.messageId);
      
      console.log('\n🎉 SUCCESS! Your GHL integration is working perfectly!');
      console.log('\n📋 Next Steps:');
      console.log('1. Go to your GoHighLevel dashboard');
      console.log('2. Navigate to Contacts');
      console.log(`3. Find contact with phone: ${testPhone}`);
      console.log('4. Click on the contact');
      console.log('5. Go to Conversations tab');
      console.log('6. You should see the WhatsApp conversation with all messages!');
      console.log('\n🔧 To use with your own WhatsApp:');
      console.log('- Set USE_MOCK_WHATSAPP=false in your .env file');
      console.log('- Restart your server');
      console.log('- Connect your real WhatsApp via QR code');
      console.log('- Enable "Sync to GHL" for conversations you want to sync');
      
      return {
        success: true,
        contactId: syncResult.contact.id,
        conversationId: syncResult.conversation.id,
        phone: testPhone,
        messages: [
          inboundResult.messageId,
          outboundResult.messageId,
          inboundResult2.messageId
        ]
      };
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.message };
  }
}

// Run the test
finalGHLTest().catch(console.error);
