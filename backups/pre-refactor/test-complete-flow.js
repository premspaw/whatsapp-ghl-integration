// Test Complete WhatsApp <-> GHL Flow
const axios = require('axios');

async function testCompleteFlow() {
  console.log('🧪 Testing Complete WhatsApp <-> GHL Flow...\n');
  
  try {
    // 1. Test WhatsApp Status
    console.log('1️⃣ Checking WhatsApp Status...');
    const statusResponse = await axios.get('http://localhost:3000/api/whatsapp/status');
    console.log('WhatsApp Status:', statusResponse.data);
    
    if (!statusResponse.data.connected) {
      console.log('❌ WhatsApp not connected. Please connect first at http://localhost:3000/simple');
      return;
    }
    
    // 2. Test GHL Webhook (simulate sending message from GHL)
    console.log('\n2️⃣ Testing GHL Webhook (GHL -> WhatsApp)...');
    const webhookPayload = {
      event: 'conversation.message.created',
      data: {
        message: {
          direction: 'outbound',
          contact: {
            phone: '+918123133382',
            id: 'test_contact_123'
          },
          message: `Test message from GHL at ${new Date().toLocaleTimeString()}`,
          conversationId: 'test_conversation_123'
        }
      }
    };
    
    try {
      const webhookResponse = await axios.post('http://localhost:3000/webhooks/ghl', webhookPayload, {
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('✅ GHL Webhook Response:', webhookResponse.data);
    } catch (webhookError) {
      console.log('❌ GHL Webhook Error:', webhookError.response?.data || webhookError.message);
    }
    
    // 3. Test GHL Conversations (check if messages are synced)
    console.log('\n3️⃣ Checking GHL Conversations...');
    try {
      const conversationsResponse = await axios.get('http://localhost:3000/api/ghl/conversations/search?contactId=test_contact_123');
      console.log('GHL Conversations:', conversationsResponse.data);
    } catch (conversationError) {
      console.log('❌ GHL Conversations Error:', conversationError.response?.data || conversationError.message);
    }
    
    console.log('\n✅ Test Complete!');
    console.log('\n📋 What to check:');
    console.log('1. Go to http://localhost:3000/simple and connect WhatsApp');
    console.log('2. Send a WhatsApp message to your connected number');
    console.log('3. Check if the message appears in GHL dashboard');
    console.log('4. Send a message from GHL and check if it appears on WhatsApp');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCompleteFlow();
