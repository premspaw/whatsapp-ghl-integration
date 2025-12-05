const EnhancedAIService = require('./services/enhancedAIService');
const GHLService = require('./services/ghlService');

async function testRealAI() {
  try {
    console.log('🧪 Testing Real AI Service...');
    
    // Initialize services
    const ghlService = new GHLService();
    const enhancedAIService = new EnhancedAIService(ghlService);
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('📚 Knowledge Base Items:', enhancedAIService.knowledgeBase.size);
    console.log('🤖 AI Personality:', enhancedAIService.aiPersonality);
    
    // Test different questions
    const questions = [
        "What does your company do?",
        "What is your company name?", 
        "What services do you offer?"
    ];
    const phoneNumber = "+918123133382";
    const conversationId = "test-conv-123";

    for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        console.log(`\n🔍 Testing: "${question}"`);
        
        try {
            const response = await enhancedAIService.generateContextualReply(
                question,
                phoneNumber,
                conversationId
            );
            
            console.log(`AI Response ${i + 1}: ${response}`);
            
            // Check if response is null or generic
            if (!response) {
                console.log("❌ AI service returned null - API key or configuration issue");
            } else if (response.includes("Thanks for your message") || response.includes("How can I assist you")) {
                console.log("⚠️  Generic response detected - investigating...");
                
                // Let's check what the enhanced reply method returns
                const enhancedResponse = await enhancedAIService.generateEnhancedReply(
                    question,
                    phoneNumber,
                    conversationId
                );
                console.log(`Enhanced Response: ${enhancedResponse}`);
            } else {
                console.log("✅ AI generated a proper contextual response");
            }
        } catch (error) {
            console.error(`❌ Error testing question "${question}":`, error.message);
            console.error('Stack:', error.stack);
        }
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error);
  }
}

testRealAI();