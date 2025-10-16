const GHLService = require('./services/ghlService');
const ConversationManager = require('./services/conversationManager');
require('dotenv').config();

async function testRealGHLSync() {
  console.log('🧪 Testing Real GHL Sync with Valid Phone Numbers\n');
  
  const ghlService = new GHLService();
  const conversationManager = new ConversationManager();
  
  // Check GHL configuration
  const status = ghlService.getStatus();
  console.log('1️⃣ GHL Service Status:', JSON.stringify(status, null, 2));
  
  if (!status.isConfigured) {
    console.log('❌ GHL service not configured. Please check your environment variables.');
    return;
  }
  
  try {
    // Create a test conversation with a real phone number format
    const testPhone = '+919876543210'; // Valid Indian phone number format
    const testContactName = 'Test User';
    
    console.log(`\n2️⃣ Creating test conversation for ${testPhone}`);
    
    // Add a test message to create a conversation
    const testMessage = {
      id: { _serialized: `test_msg_${Date.now()}` },
      from: testPhone,
      body: 'Hello, this is a test message for GHL sync',
      timestamp: Date.now(),
      type: 'text'
    };
    
    // Store the conversation
    const conversation = await conversationManager.addMessage(testMessage);
    console.log('✅ Test conversation created:', conversation.id);
    
    // Enable GHL sync for this conversation
    await conversationManager.toggleGHLSync(conversation.id, true);
    console.log('✅ GHL sync enabled for conversation');
    
    // Now sync to GHL
    console.log('\n3️⃣ Syncing conversation to GHL...');
    const syncResult = await ghlService.syncConversation(conversation);
    
    if (syncResult) {
      console.log('✅ Conversation synced successfully to GHL!');
      console.log('📞 Contact ID:', syncResult.contact?.id);
      console.log('💬 Conversation ID:', syncResult.conversation?.id);
      
      // Verify the conversation exists in GHL
      console.log('\n4️⃣ Verifying conversation in GHL...');
      const ghlConversations = await ghlService.getConversations(syncResult.contact.id);
      console.log(`✅ Found ${ghlConversations.length} conversations for contact in GHL`);
      
      if (ghlConversations.length > 0) {
        const ghlConv = ghlConversations[0];
        console.log('📋 GHL Conversation Details:');
        console.log('   ID:', ghlConv.id);
        console.log('   Type:', ghlConv.type);
        console.log('   Status:', ghlConv.status);
        console.log('   Provider:', ghlConv.provider);
        
        // Get messages from GHL conversation
        console.log('\n5️⃣ Retrieving messages from GHL...');
        const ghlMessages = await ghlService.getConversationMessages(ghlConv.id);
        console.log(`✅ Found ${ghlMessages.length} messages in GHL conversation`);
        
        if (ghlMessages.length > 0) {
          console.log('📨 Sample GHL messages:');
          ghlMessages.slice(0, 3).forEach((msg, index) => {
            console.log(`   ${index + 1}. [${msg.direction}] ${msg.message?.substring(0, 50)}...`);
          });
        }
      }
    }
    
    console.log('\n🎉 Test completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Go to your GHL dashboard');
    console.log('2. Navigate to Contacts');
    console.log(`3. Find contact with phone: ${testPhone}`);
    console.log('4. Click on the contact');
    console.log('5. Go to Conversations tab');
    console.log('6. You should see the WhatsApp conversation!');
    
    return {
      success: true,
      contactId: syncResult.contact?.id,
      conversationId: syncResult.conversation?.id,
      phone: testPhone
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.message };
  }
}

// Run the test
testRealGHLSync().catch(console.error);
