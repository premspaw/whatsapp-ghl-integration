require('dotenv').config();
const { getSupabase } = require('./services/db/supabaseClient');

async function checkEmbeddings() {
  console.log('🔍 Checking embeddings in database...');
  
  // Check environment variables
  console.log('Environment check:');
  console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');
  console.log('- SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Missing');
  
  const supabase = getSupabase();
  if (!supabase) {
    console.error('❌ Supabase client not available');
    return;
  }
  
  console.log('✅ Supabase client created successfully');
  
  try {
    // Check total count of embeddings
    const { data: embeddings, error: countError } = await supabase
      .from('ai_embeddings')
      .select('*');
    
    if (countError) {
      console.error('❌ Error fetching embeddings:', countError.message);
      return;
    }
    
    console.log(`📊 Total embeddings in database: ${embeddings?.length || 0}`);
    
    if (embeddings && embeddings.length > 0) {
      console.log('\n📋 Sample embeddings:');
      embeddings.slice(0, 3).forEach((embedding, index) => {
        console.log(`${index + 1}. ID: ${embedding.id}`);
        console.log(`   Source: ${embedding.source_type} (${embedding.source_id})`);
        console.log(`   Text: ${embedding.text.substring(0, 100)}...`);
        console.log(`   Embedding length: ${embedding.embedding?.length || 'null'}`);
        console.log(`   Created: ${embedding.created_at}`);
        console.log('');
      });
      
      // Test the match_embeddings function
      console.log('🧪 Testing match_embeddings function...');
      console.log('Debug: About to test match_embeddings with embeddings count:', embeddings.length);
      
      console.log('Debug: Accessing first embedding...');
      const firstEmbedding = embeddings[0];
      console.log('Debug: First embedding keys:', Object.keys(firstEmbedding));
      console.log('Debug: First embedding has embedding property:', 'embedding' in firstEmbedding);
      
      const sampleEmbedding = embeddings[0].embedding;
      console.log('Debug: Sample embedding type:', typeof sampleEmbedding);
      console.log('Debug: Sample embedding is array:', Array.isArray(sampleEmbedding));
      
      // Parse the embedding if it's a string
      let parsedEmbedding = sampleEmbedding;
      if (typeof sampleEmbedding === 'string') {
        try {
          parsedEmbedding = JSON.parse(sampleEmbedding);
          console.log('Debug: Parsed embedding length:', parsedEmbedding.length);
        } catch (e) {
          console.error('Debug: Failed to parse embedding:', e.message);
        }
      }
      
      if (parsedEmbedding && Array.isArray(parsedEmbedding)) {
        console.log('Debug: Getting test embedding...');
        console.log('Debug: Test embedding length:', parsedEmbedding?.length);
        
        console.log('Debug: Calling match_embeddings RPC...');
        const { data: matchResults, error: matchError } = await supabase
          .rpc('match_embeddings', {
            query_embedding: parsedEmbedding,
            match_count: 3,
            filter_conversation: null
          });
        
        console.log('Debug: RPC call completed');
        
        if (matchError) {
          console.error('❌ match_embeddings function error:', matchError.message);
        } else {
          console.log(`✅ match_embeddings returned ${matchResults?.length || 0} results`);
          if (matchResults && matchResults.length > 0) {
            console.log('Sample match result:');
            const result = matchResults[0];
            console.log('- Full result keys:', Object.keys(result));
            console.log('- ID:', result.id);
            console.log('- Similarity:', result.similarity);
            console.log('- Distance:', result.distance);
            console.log('- Text preview:', result.content?.substring(0, 100) + '...');
          }
        }
      } else {
        console.log('⚠️ No valid embedding found to test with');
      }
    } else {
      console.log('⚠️ No embeddings found in database');
      
      // Check if there are any knowledge base items
      const { data: kbItems, error: kbError } = await supabase
        .from('ai_embeddings')
        .select('source_type, source_id')
        .limit(10);
      
      if (!kbError && kbItems) {
        console.log('Knowledge base sources:', kbItems);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking embeddings:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

checkEmbeddings().then(() => {
  console.log('🏁 Embedding check complete');
  process.exit(0);
}).catch(error => {
  console.error('💥 Check failed:', error);
  process.exit(1);
});