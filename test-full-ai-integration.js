require('dotenv').config();
const EnhancedAIService = require('./services/enhancedAIService');
const GHLService = require('./services/ghlService');

async function testFullAIIntegration() {
  console.log('🤖 Testing Full AI Integration with RAG...\n');
  
  try {
    // Initialize GHL service first
    const ghlService = new GHLService();
    
    // Initialize the enhanced AI service with ghlService
    const aiService = new EnhancedAIService(ghlService);
    console.log('✅ EnhancedAIService initialized with GHL service');
    
    // Test the embeddings service directly first
    console.log('\n1. Testing embeddings service...');
    if (aiService.embeddings) {
      console.log('✅ Embeddings service available');
      
      // Test retrieval with lower threshold
      const testResults = await aiService.safeRetrieveEmbeddings('What services do you offer?', null, null, 0.3);
      console.log(`✅ Retrieved ${testResults.length} embeddings safely (threshold: 0.3)`);
      
      if (testResults.length > 0) {
        console.log('Sample result:', {
          similarity: testResults[0].similarity,
          source: testResults[0].source_type,
          textPreview: testResults[0].text?.substring(0, 100) + '...'
        });
      }
    } else {
      console.log('⚠️ Embeddings service not available');
    }
    
    // Test message processing with RAG context
    console.log('\n2. Testing message processing with RAG context...');
    
    const testMessages = [
      'What services does your company provide?',
      'How can I get customer support?',
      'Tell me about your business',
      'What are your contact details?',
      'Do you offer WhatsApp integration?'
    ];
    
    for (const message of testMessages) {
      console.log(`\nTesting: "${message}"`);
      console.log('─'.repeat(50));
      
      try {
        // Create a mock conversation context
        const mockContext = {
          conversationId: 'test-conversation-123',
          contactId: 'test-contact-456',
          phone: '+1234567890',
          messages: [
            { role: 'user', content: message, timestamp: new Date() }
          ]
        };
        
        // Test the AI response generation
        const response = await aiService.generateContextualReply(
          message,
          mockContext.phone,
          mockContext.conversationId
        );
        
        console.log('🤖 AI Response:', response ? `"${response.substring(0, 100)}..."` : 'No response');
        
        if (response && response.content) {
          console.log('✅ AI Response generated successfully');
          console.log(`Response length: ${response.content.length} characters`);
          console.log(`Response preview: ${response.content.substring(0, 200)}...`);
          
          // Check if the response seems to include knowledge base context
          const hasKnowledgeContext = response.content.toLowerCase().includes('support') ||
                                    response.content.toLowerCase().includes('service') ||
                                    response.content.toLowerCase().includes('whatsapp') ||
                                    response.content.toLowerCase().includes('business');
          
          if (hasKnowledgeContext) {
            console.log('✅ Response appears to include knowledge base context');
          } else {
            console.log('⚠️ Response may not include knowledge base context');
          }
        } else if (response) {
          console.log('✅ Response generated successfully');
        } else {
          console.log('❌ No response generated');
        }
        
      } catch (error) {
        console.error(`❌ Error processing message "${message}":`, error.message);
      }
    }
    
    // Test knowledge base search directly
    console.log('\n3. Testing knowledge base search...');
    
    try {
      const kbResults = aiService.searchKnowledgeBase('customer support');
      console.log(`Knowledge base search returned ${kbResults.length} results`);
      
      if (kbResults.length > 0) {
        kbResults.forEach((result, index) => {
          console.log(`${index + 1}. ${result.title || 'Untitled'}: ${result.content?.substring(0, 100)}...`);
        });
      }
    } catch (error) {
      console.error('❌ Knowledge base search error:', error.message);
    }
    
    // Test memory functionality
    console.log('\n4. Testing memory functionality...');
    
    try {
      // Test storing conversation
      await aiService.storeConversation('+1234567890', 'Test user message', 'Test assistant response');
      console.log('✅ Conversation storage successful');
      
      // Test retrieving memory
      const memory = await aiService.loadConversationMemory('+1234567890');
      console.log('✅ Memory retrieval successful:', memory ? 'Found memory' : 'No memory found');
      
    } catch (error) {
      console.error('❌ Memory functionality error:', error.message);
    }
    
    console.log('\n✅ Full AI integration test completed!');
    
  } catch (error) {
    console.error('❌ Full AI integration test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testFullAIIntegration().then(() => {
  console.log('🏁 Integration test complete');
  process.exit(0);
}).catch(error => {
  console.error('💥 Integration test failed:', error);
  process.exit(1);
});