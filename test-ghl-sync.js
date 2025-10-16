const axios = require('axios');

// Test script to check GHL conversation sync
async function testGHLSync() {
  try {
    console.log('🧪 Testing GHL conversation sync...');
    
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;
    
    if (!apiKey || !locationId) {
      console.error('❌ GHL API key or location ID not found');
      return;
    }
    
    const client = axios.create({
      baseURL: 'https://services.leadconnectorhq.com',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      }
    });
    
    // Get contacts
    console.log('📞 Fetching contacts...');
    const contactsResponse = await client.get('/contacts/', {
      params: { locationId }
    });
    
    const contacts = contactsResponse.data.contacts || contactsResponse.data || [];
    console.log(`Found ${contacts.length} contacts`);
    
    // Find the test contact
    const testContact = contacts.find(contact => 
      contact.phone && contact.phone.includes('918123133382')
    );
    
    if (!testContact) {
      console.log('❌ Test contact not found');
      return;
    }
    
    console.log(`✅ Found test contact: ${testContact.firstName} (${testContact.phone})`);
    
    // Get conversations for this contact
    console.log('💬 Fetching conversations...');
    const conversationsResponse = await client.get('/conversations/search', {
      params: { 
        locationId,
        contactId: testContact.id 
      }
    });
    const conversations = conversationsResponse.data.conversations || conversationsResponse.data || [];
    
    console.log(`Found ${conversations.length} conversations`);
    
    for (const conv of conversations) {
      console.log(`\n📋 Conversation ${conv.id}:`);
      console.log(`   Type: ${conv.type}`);
      console.log(`   Status: ${conv.status}`);
      console.log(`   Phone: ${conv.phoneNumber}`);
      
      // Get messages for this conversation
      try {
        const messagesResponse = await client.get('/conversations/messages', {
          params: {
            conversationId: conv.id,
            locationId
          }
        });
        const messages = messagesResponse.data.messages || messagesResponse.data || [];
        
        console.log(`   Messages: ${messages.length}`);
        
        if (Array.isArray(messages)) {
          for (const msg of messages.slice(-5)) { // Show last 5 messages
            console.log(`     ${msg.direction}: ${msg.message ? msg.message.substring(0, 50) : 'No message'}...`);
          }
        } else {
          console.log(`   Messages data:`, messages);
        }
      } catch (msgError) {
        console.log(`   Error fetching messages: ${msgError.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testGHLSync();