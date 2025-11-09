require('dotenv').config();
const EmbeddingsService = require('./services/embeddingsService');

async function testRAGRetrieval() {
  console.log('🧠 Testing RAG Retrieval with Fixed Similarity...\n');
  
  try {
    // Initialize embeddings service
    const embeddingsService = new EmbeddingsService();
    console.log('✅ EmbeddingsService initialized');
    
    // Test queries to check knowledge retrieval
    const testQueries = [
      'What is your business about?',
      'How can I contact support?',
      'What services do you offer?',
      'Tell me about your company',
      'What are your business hours?'
    ];
    
    console.log('🔍 Testing knowledge retrieval with different queries...\n');
    
    for (const query of testQueries) {
      console.log(`Query: "${query}"`);
      console.log('─'.repeat(50));
      
      try {
        const results = await embeddingsService.retrieve({
          query: query,
          topK: 3,
          conversationId: null,
          minSimilarity: 0.1 // Lower threshold to see more results
        });
        
        console.log(`Found ${results.length} relevant chunks:`);
        
        if (results.length > 0) {
          results.forEach((result, index) => {
            console.log(`\n${index + 1}. Similarity: ${result.similarity?.toFixed(4) || 'N/A'}`);
            console.log(`   Distance: ${result.distance?.toFixed(4) || 'N/A'}`);
            console.log(`   Source: ${result.source_type}/${result.source_id}`);
            console.log(`   Text: ${result.text?.substring(0, 150)}...`);
            
            if (result.chunk_meta && Object.keys(result.chunk_meta).length > 0) {
              console.log(`   Meta: ${JSON.stringify(result.chunk_meta)}`);
            }
          });
        } else {
          console.log('   No relevant chunks found');
        }
        
      } catch (error) {
        console.error(`   ❌ Error retrieving for query "${query}":`, error.message);
      }
      
      console.log('\n' + '═'.repeat(60) + '\n');
    }
    
    // Test with higher similarity threshold
    console.log('🎯 Testing with higher similarity threshold (0.5)...\n');
    
    const highQualityResults = await embeddingsService.retrieve({
      query: 'What services do you provide?',
      topK: 5,
      conversationId: null,
      minSimilarity: 0.5
    });
    
    console.log(`High-quality results (similarity >= 0.5): ${highQualityResults.length}`);
    highQualityResults.forEach((result, index) => {
      console.log(`${index + 1}. Similarity: ${result.similarity?.toFixed(4)} - ${result.text?.substring(0, 100)}...`);
    });
    
    // Test conversation-specific retrieval
    console.log('\n🗣️ Testing conversation-specific retrieval...\n');
    
    const conversationResults = await embeddingsService.retrieve({
      query: 'previous conversation',
      topK: 3,
      conversationId: 'test-conversation-id', // This probably won't match anything
      minSimilarity: 0.1
    });
    
    console.log(`Conversation-specific results: ${conversationResults.length}`);
    
    console.log('\n✅ RAG retrieval test completed successfully!');
    
  } catch (error) {
    console.error('❌ RAG retrieval test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testRAGRetrieval().then(() => {
  console.log('🏁 Test complete');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});