const axios = require('axios');

async function testWhatsAppAI() {
  try {
    console.log('🧪 Testing WhatsApp AI integration...');
    
    // Simulate a WhatsApp webhook message
    const testPayload = {
      from: '+918123133382',
      body: 'Hi, I need help with my order status',
      timestamp: Date.now(),
      id: `test_${Date.now()}`,
      type: 'text'
    };
    
    console.log('📱 Sending test message:', testPayload);
    
    // Send to the webhook endpoint
    const response = await axios.post('http://localhost:3000/webhook/whatsapp', testPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Webhook response:', response.status);
    console.log('📄 Response data:', response.data);
    
    // Wait a moment for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🔍 Check the logs for AI response generation...');
    
  } catch (error) {
    console.error('❌ Error testing WhatsApp AI:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testWhatsAppAI();