const axios = require('axios');
require('dotenv').config();

async function checkMessageTypes() {
  console.log('🔍 Checking message types from existing conversations\n');
  
  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  const baseUrl = 'https://services.leadconnectorhq.com';
  
  const client = axios.create({
    baseURL: baseUrl,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28'
    }
  });
  
  try {
    // Get conversations with messages
    const response = await client.get('/conversations/search', {
      params: {
        locationId: locationId,
        limit: 10
      }
    });
    
    console.log('Found conversations:', response.data.conversations.length);
    
    // Look for conversations with messages
    for (const conv of response.data.conversations) {
      if (conv.lastMessageType) {
        console.log(`\nConversation ${conv.id}:`);
        console.log(`  Type: ${conv.type}`);
        console.log(`  Last Message Type: ${conv.lastMessageType}`);
        console.log(`  Phone: ${conv.phone}`);
      }
    }
    
    // Try to get messages from the first conversation
    if (response.data.conversations.length > 0) {
      const firstConv = response.data.conversations[0];
      console.log(`\n🔍 Checking messages for conversation: ${firstConv.id}`);
      
      try {
        const messagesResponse = await client.get(`/conversations/${firstConv.id}/messages`);
        console.log('Messages found:', messagesResponse.data.messages?.length || 0);
        
        if (messagesResponse.data.messages && messagesResponse.data.messages.length > 0) {
          console.log('\nSample message structure:');
          console.log(JSON.stringify(messagesResponse.data.messages[0], null, 2));
        }
      } catch (msgError) {
        console.log('Could not fetch messages:', msgError.response?.data?.message || msgError.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

checkMessageTypes().catch(console.error);
