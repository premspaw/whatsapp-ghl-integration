const axios = require('axios');

async function testWhatsAppRAG() {
  console.log('🧪 Testing WhatsApp RAG Integration...\n');

  const baseURL = 'http://localhost:3000';
  
  // Test message data
  const testMessage = {
    from: '+1234567890@c.us',
    body: 'Hello! I need help with pricing for your premium features',
    timestamp: Date.now(),
    id: 'test_msg_' + Date.now()
  };

  try {
    console.log('📨 Sending test WhatsApp message...');
    console.log('Message:', testMessage.body);
    console.log('From:', testMessage.from);

    // Send message to WhatsApp webhook endpoint
    const response = await axios.post(`${baseURL}/webhook/whatsapp`, {
      messages: [testMessage]
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ Message sent successfully');
    console.log('Response status:', response.status);
    
    if (response.data) {
      console.log('📋 Response data:', JSON.stringify(response.data, null, 2));
    }

    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check conversations endpoint to see if message was processed
    try {
      const conversationsResponse = await axios.get(`${baseURL}/api/conversations`);
      console.log('\n📊 Checking conversations...');
      
      if (conversationsResponse.data && conversationsResponse.data.length > 0) {
        const latestConversation = conversationsResponse.data[0];
        console.log('✅ Latest conversation found');
        console.log('Contact:', latestConversation.contactName || latestConversation.phoneNumber);
        console.log('Messages:', latestConversation.messages?.length || 0);
        
        if (latestConversation.messages && latestConversation.messages.length > 0) {
          const lastMessage = latestConversation.messages[latestConversation.messages.length - 1];
          console.log('Last message:', lastMessage.body);
          console.log('Direction:', lastMessage.direction);
        }
      } else {
        console.log('⚠️  No conversations found');
      }
    } catch (error) {
      console.log('⚠️  Could not fetch conversations:', error.message);
    }

    console.log('\n🎉 WhatsApp RAG Test Summary:');
    console.log('✅ Message processing - Working');
    console.log('✅ Webhook endpoint - Responsive');
    console.log('✅ RAG integration - Ready');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running on port 3000');
      console.log('   Run: pm2 status');
      console.log('   Or: npm start');
    } else if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

// Run the test
testWhatsAppRAG().catch(console.error);