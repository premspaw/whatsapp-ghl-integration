require('dotenv').config();
const { getSupabase } = require('./services/db/supabaseClient');

async function manualFunctionSetup() {
  console.log('🔧 Manual function setup...');
  
  const supabase = getSupabase();
  if (!supabase) {
    console.error('❌ Supabase client not available');
    return;
  }

  try {
    // Since we can't create functions directly, let's create a workaround
    // We'll create a view that does the similarity calculation
    console.log('1. Creating similarity view as workaround...');
    
    // First, let's test if we can create a simple view
    const createViewSQL = `
      CREATE OR REPLACE VIEW embedding_similarities AS
      SELECT 
        id,
        conversation_id,
        source_type,
        source_id,
        text,
        embedding,
        chunk_meta,
        created_at
      FROM ai_embeddings;
    `;

    // Try to execute via different methods
    let viewCreated = false;
    
    // Method 1: Try rpc with different function names
    const rpcMethods = ['exec', 'execute', 'run_sql', 'query'];
    
    for (const method of rpcMethods) {
      try {
        const { error } = await supabase.rpc(method, { sql: createViewSQL });
        if (!error) {
          console.log(`✅ View created using ${method}`);
          viewCreated = true;
          break;
        }
      } catch (e) {
        // Continue to next method
      }
    }
    
    if (!viewCreated) {
      console.log('❌ Cannot create views via RPC methods');
      console.log('The database client has limited DDL capabilities.');
      
      // Let's try a different approach - create a JavaScript function that does the similarity calculation
      console.log('2. Creating JavaScript-based similarity function...');
      
      // Test current function to get the structure
      const testEmbedding = new Array(1536).fill(0.1);
      const { data: currentResults, error } = await supabase
        .rpc('match_embeddings', {
          query_embedding: testEmbedding,
          match_count: 5,
          filter_conversation: null
        });

      if (error) {
        console.error('❌ Cannot test current function:', error.message);
        return;
      }

      console.log('✅ Current function returns:', currentResults?.length || 0, 'results');
      
      if (currentResults && currentResults.length > 0) {
        // Calculate similarity in JavaScript
        const resultsWithSimilarity = currentResults.map(result => {
          // The distance is already calculated by PostgreSQL
          // Similarity = 1 - distance (for cosine distance)
          const similarity = result.distance !== undefined ? (1 - result.distance) : null;
          
          return {
            ...result,
            similarity: similarity
          };
        });
        
        console.log('✅ JavaScript similarity calculation working!');
        console.log('Sample result with similarity:', {
          id: resultsWithSimilarity[0].id,
          distance: resultsWithSimilarity[0].distance,
          similarity: resultsWithSimilarity[0].similarity
        });
        
        // Now let's update the knowledge base service to use this approach
        console.log('3. The solution is to modify the knowledge base service to calculate similarity in JavaScript');
        return true;
      }
    }

  } catch (error) {
    console.error('❌ Manual setup error:', error.message);
  }
  
  return false;
}

manualFunctionSetup().then((success) => {
  if (success) {
    console.log('🏁 Manual setup complete - ready to update knowledge base service');
  } else {
    console.log('🏁 Manual setup complete - need alternative approach');
  }
});