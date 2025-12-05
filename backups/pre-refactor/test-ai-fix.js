const EnhancedAIService = require('./services/enhancedAIService');
const GHLService = require('./services/ghlService');

async function testAIResponse() {
  try {
    console.log('🧪 Testing AI response generation...');
    
    // Initialize services
    const ghlService = new GHLService();
    const enhancedAIService = new EnhancedAIService(ghlService);
    
    // Test with a simple message
    const testMessage = "Hello, I need help with my order";
    const testPhone = "+918123133382";
    const testConversationId = "test-conversation";
    
    console.log(`📱 Testing message: "${testMessage}"`);
    console.log(`📞 Phone: ${testPhone}`);
    
    // Generate AI response
    const response = await enhancedAIService.generateContextualReply(
      testMessage, 
      testPhone, 
      testConversationId
    );
    
    if (response) {
      console.log('✅ AI Response generated successfully:');
      console.log(`🤖 Response: "${response}"`);
    } else {
      console.log('❌ No AI response generated');
    }
    
  } catch (error) {
    console.error('❌ Error testing AI response:', error);
  }
}

testAIResponse();