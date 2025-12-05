const axios = require('axios');
require('dotenv').config();

async function findExistingMessages() {
  console.log('🔍 Finding existing messages to understand the structure\n');
  
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
    // Get conversations that might have messages
    const response = await client.get('/conversations/search', {
      params: {
        locationId: locationId,
        limit: 20
      }
    });
    
    console.log('Found conversations:', response.data.conversations.length);
    
    // Try to find conversations with messages
    for (const conv of response.data.conversations) {
      if (conv.lastMessageType && conv.lastMessageType !== 'TYPE_NO_SHOW') {
        console.log(`\n🔍 Checking conversation: ${conv.id}`);
        console.log(`  Phone: ${conv.phone}`);
        console.log(`  Last Message Type: ${conv.lastMessageType}`);
        console.log(`  Type: ${conv.type}`);
        
        try {
          const messagesResponse = await client.get(`/conversations/${conv.id}/messages`);
          const messages = messagesResponse.data.messages || messagesResponse.data || [];
          
          if (messages.length > 0) {
            console.log(`  ✅ Found ${messages.length} messages!`);
            console.log('\n📨 Sample message structure:');
            console.log(JSON.stringify(messages[0], null, 2));
            
            // Look for type field in the message
            if (messages[0].type) {
              console.log(`\n🎯 Found message type: "${messages[0].type}"`);
            }
            
            break; // Found messages, stop looking
          } else {
            console.log(`  ❌ No messages found`);
          }
        } catch (msgError) {
          console.log(`  ❌ Error fetching messages: ${msgError.response?.data?.message || msgError.message}`);
        }
      }
    }
    
    // Try some common message type values
    console.log('\n🧪 Testing common message type values...');
    const commonTypes = [
      'text',
      'TEXT',
      'message',
      'MESSAGE',
      'sms',
      'SMS',
      'whatsapp',
      'WHATSAPP',
      'inbound',
      'INBOUND',
      'outbound',
      'OUTBOUND'
    ];
    
    const contactId = '85wGgV7Rjun1e3SkvUhI';
    const conversationId = 'xtTApslkThBQsfgDXnqd';
    
    for (const type of commonTypes) {
      try {
        console.log(`Testing type: "${type}"`);
        const response = await client.post('/conversations/messages', {
          contactId: contactId,
          conversationId: conversationId,
          message: `Test message with type: ${type}`,
          type: type,
          direction: 'inbound',
          locationId: locationId
        });
        console.log(`✅ SUCCESS with type "${type}":`, response.data);
        break; // Found working type, stop testing
      } catch (error) {
        console.log(`❌ Failed with type "${type}": ${error.response?.data?.message?.[0] || error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

findExistingMessages().catch(console.error);
