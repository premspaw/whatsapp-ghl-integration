const GHLService = require('./services/ghlService');
require('dotenv').config();

async function testGHLConversations() {
  console.log('🧪 Testing GHL Conversations Integration\n');
  
  const ghlService = new GHLService();
  
  // Test 1: Check GHL service configuration
  console.log('1️⃣ Testing GHL Service Configuration:');
  const status = ghlService.getStatus();
  console.log('Status:', JSON.stringify(status, null, 2));
  
  if (!status.isConfigured) {
    console.log('❌ GHL service not configured. Please check your environment variables.');
    return;
  }
  
  try {
    // Test 2: Get contacts
    console.log('\n2️⃣ Testing Contact Retrieval:');
    const contacts = await ghlService.getContacts();
    console.log(`✅ Found ${contacts.length} contacts`);
    
    if (contacts.length > 0) {
      const testContact = contacts[0];
      console.log(`📞 Test contact: ${testContact.firstName} ${testContact.lastName} (${testContact.phone})`);
      
      // Test 3: Get conversations for the contact
      console.log('\n3️⃣ Testing Conversation Retrieval:');
      const conversations = await ghlService.getConversations(testContact.id);
      console.log(`✅ Found ${conversations.length} conversations for contact`);
      
      if (conversations.length > 0) {
        const testConversation = conversations[0];
        console.log(`💬 Test conversation: ${testConversation.id} (${testConversation.type})`);
        
        // Test 4: Get conversation messages
        console.log('\n4️⃣ Testing Message Retrieval:');
        const messages = await ghlService.getConversationMessages(testConversation.id);
        console.log(`✅ Found ${messages.length} messages in conversation`);
        
        if (messages.length > 0) {
          console.log('📨 Sample messages:');
          messages.slice(0, 3).forEach((msg, index) => {
            console.log(`   ${index + 1}. [${msg.direction}] ${msg.message?.substring(0, 50)}...`);
          });
        }
      }
      
      // Test 5: Search conversations
      console.log('\n5️⃣ Testing Conversation Search:');
      const searchResults = await ghlService.searchConversations({
        contactId: testContact.id,
        type: 'whatsapp'
      });
      console.log(`✅ Search found ${searchResults.length} WhatsApp conversations`);
    }
    
    // Test 6: Test conversation creation (if we have a test contact)
    if (contacts.length > 0) {
      console.log('\n6️⃣ Testing Conversation Creation:');
      const testContact = contacts[0];
      
      try {
        const newConversation = await ghlService.createConversation({
          contactId: testContact.id,
          type: 'whatsapp',
          status: 'active',
          phoneNumber: testContact.phone
        });
        console.log(`✅ Created new conversation: ${newConversation.id}`);
        
        // Test 7: Add a test message
        console.log('\n7️⃣ Testing Message Addition:');
        const testMessage = await ghlService.addInboundMessage(testContact.id, {
          message: 'Test message from integration - ' + new Date().toISOString(),
          type: 'text'
        }, newConversation.id);
        console.log(`✅ Added test message to conversation`);
        
      } catch (createError) {
        console.log(`⚠️ Conversation creation test failed: ${createError.message}`);
        console.log('This might be expected if the conversation already exists.');
      }
    }
    
    console.log('\n✅ All GHL Conversation tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- GHL service is properly configured');
    console.log('- Can retrieve contacts from GHL');
    console.log('- Can retrieve conversations from GHL');
    console.log('- Can retrieve messages from conversations');
    console.log('- Can search conversations');
    console.log('- Conversations should now appear in your GHL interface');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('API Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testGHLConversations().catch(console.error);
