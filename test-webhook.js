// Test GHL Webhook
const axios = require('axios');

async function testWebhook() {
  try {
    const webhookUrl = 'http://localhost:3000/webhooks/ghl';
    const payload = {
      event: 'conversation.message.created',
      data: {
        message: {
          direction: 'outbound',
          contact: {
            phone: '+918123133382',
            id: 'test_contact_123'
          },
          message: 'Test message from GHL webhook - ' + new Date().toLocaleTimeString(),
          conversationId: 'test_conversation_123'
        }
      }
    };

    console.log('🧪 Testing GHL webhook...');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Webhook response:', response.data);
  } catch (error) {
    console.error('❌ Webhook test failed:', error.response?.data || error.message);
  }
}

testWebhook();
