require('dotenv').config();
const { getSupabase } = require('./services/db/supabaseClient');

async function debugFunction() {
  console.log('🔍 Debugging match_embeddings function...');
  
  const supabase = getSupabase();
  if (!supabase) {
    console.error('❌ Supabase client not available');
    return;
  }

  try {
    // Test with a simple query to see what the function actually returns
    console.log('Testing function with dummy data...');
    
    const testEmbedding = new Array(1536).fill(0.1);
    const { data, error } = await supabase
      .rpc('match_embeddings', {
        query_embedding: testEmbedding,
        match_count: 2,
        filter_conversation: null
      });

    if (error) {
      console.error('❌ Function error:', error);
      
      // If function doesn't exist, let's try to create it manually
      if (error.message.includes('does not exist')) {
        console.log('Function does not exist. The migration may not have worked.');
        console.log('Let me check if we can access the database directly...');
        
        // Try a simple query to test database access
        const { data: testData, error: testError } = await supabase
          .from('ai_embeddings')
          .select('id')
          .limit(1);
          
        if (testError) {
          console.error('❌ Database access error:', testError);
        } else {
          console.log('✅ Database access works, but function is missing');
        }
      }
      return;
    }

    console.log('✅ Function executed successfully!');
    console.log('Results count:', data?.length || 0);
    
    if (data && data.length > 0) {
      const result = data[0];
      console.log('\nFirst result analysis:');
      console.log('- Available fields:', Object.keys(result));
      console.log('- Has similarity field:', 'similarity' in result);
      console.log('- Has distance field:', 'distance' in result);
      
      if ('similarity' in result) {
        console.log('- Similarity value:', result.similarity);
      }
      if ('distance' in result) {
        console.log('- Distance value:', result.distance);
      }
      
      // Check if we're getting the expected structure
      console.log('\nExpected vs Actual:');
      console.log('Expected: similarity field with value 0-1');
      console.log('Actual:', 'similarity' in result ? `similarity: ${result.similarity}` : 'No similarity field');
    }

  } catch (error) {
    console.error('❌ Debug error:', error.message);
  }
}

debugFunction().then(() => {
  console.log('🏁 Debug complete');
});