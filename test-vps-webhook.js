// Test VPS Webhook for Template Messages
const axios = require('axios');

async function testVPSWebhook() {
  console.log('🧪 Testing VPS Webhook for Template Messages...\n');

  const vpsUrl = 'https://api.synthcore.in';
  const endpoint = '/api/whatsapp/send-template';
  
  const testData = {
    to: '+918123133382',
    templateName: 'welcome',
    variables: {
      name: 'Prem'
    }
  };

  try {
    console.log('📤 Sending test request to:', vpsUrl + endpoint);
    console.log('📋 Test data:', JSON.stringify(testData, null, 2));
    console.log('\n⏳ Waiting for response...\n');

    const response = await axios.post(vpsUrl + endpoint, testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 seconds timeout
    });

    console.log('✅ Response Status:', response.status);
    console.log('✅ Response Data:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('\n🎉 SUCCESS! Template message sent!');
      console.log('📱 Check WhatsApp on', testData.to);
      console.log('💬 Message should be:', 'Hi Prem this new automation working checking');
    } else {
      console.log('\n⚠️ Response indicates failure:', response.data.error || response.data.message);
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
    
    if (error.response) {
      console.log('📊 Response Status:', error.response.status);
      console.log('📊 Response Data:', error.response.data);
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.log('\n🔴 VPS is not accessible or not running');
      console.log('💡 Check if', vpsUrl, 'is accessible in your browser');
    }
  }
}

// Run the test
testVPSWebhook();

