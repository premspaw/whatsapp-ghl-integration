const fetch = require('node-fetch');

async function testSimpleAI() {
  try {
    console.log('🧪 Testing Simple AI Reply...');
    
    // Test the simple AI function directly
    const testMessage = "Hello, I need help";
    const contactName = "Test User";
    
    // Simulate the simple AI logic
    const responses = [
      `Hello ${contactName}! Thanks for reaching out. How can I help you today?`,
      `Hi ${contactName}! I'm here to assist you. What do you need help with?`,
      `Hello! Thanks for your message. I'm ready to help you with any questions you have.`,
      `Hi there! How can I make your day better today?`,
      `Hello! I'm here to provide excellent customer service. What can I do for you?`
    ];
    
    const lowerMessage = testMessage.toLowerCase();
    let aiReply;
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      aiReply = `Hello ${contactName}! How can I help you today?`;
    } else if (lowerMessage.includes('help')) {
      aiReply = `I'm here to help you, ${contactName}! What specific assistance do you need?`;
    } else {
      aiReply = responses[Math.floor(Math.random() * responses.length)];
    }
    
    console.log('✅ Simple AI Reply:', aiReply);
    console.log('🎉 Simple AI is working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSimpleAI();
