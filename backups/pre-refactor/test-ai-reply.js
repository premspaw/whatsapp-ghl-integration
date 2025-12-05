const fetch = require('node-fetch');

async function testAI() {
  try {
    console.log('🧪 Testing AI Reply Generation...');
    
    const response = await fetch('http://localhost:3000/api/mcp-ai/test-contextual', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: "Hello, I need help with my order",
        phoneNumber: "+918123133382",
        conversationId: "test123"
      })
    });
    
    const data = await response.json();
    console.log('✅ AI Test Response:', data);
    
    if (data.success && data.aiReply) {
      console.log('🎉 AI is working! Reply:', data.aiReply);
    } else {
      console.log('❌ AI test failed:', data.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Wait a moment for server to start, then test
setTimeout(testAI, 3000);
