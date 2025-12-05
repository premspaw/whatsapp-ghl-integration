const fetch = require('node-fetch');

async function testSendAPI() {
  try {
    console.log('🧪 Testing WhatsApp Send API...');
    
    const response = await fetch('http://localhost:3000/api/whatsapp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: '+918123133382',
        message: 'Test message from API'
      })
    });
    
    const data = await response.json();
    console.log('📤 Send API Response:', data);
    
    if (data.success) {
      console.log('✅ Send API is working!');
    } else {
      console.log('❌ Send API failed:', data.error);
      if (data.debug) {
        console.log('🔍 Debug info:', data.debug);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSendAPI();
