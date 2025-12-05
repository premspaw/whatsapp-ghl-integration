require('dotenv').config();
const { getSupabase } = require('./services/db/supabaseClient');

async function forceUpdateFunction() {
  console.log('🔧 Force updating match_embeddings function...');
  
  const supabase = getSupabase();
  if (!supabase) {
    console.error('❌ Supabase client not available');
    return;
  }

  try {
    // First, drop the existing function
    console.log('1. Dropping existing function...');
    const dropResult = await supabase.rpc('exec', {
      sql: 'DROP FUNCTION IF EXISTS match_embeddings(vector, int, uuid);'
    });
    
    if (dropResult.error) {
      console.log('Note: Could not drop function (may not exist or exec not available):', dropResult.error.message);
    } else {
      console.log('✅ Function dropped successfully');
    }

    // Now create the new function with similarity calculation
    console.log('2. Creating new function with similarity...');
    const createSQL = `
      CREATE OR REPLACE FUNCTION match_embeddings(
        query_embedding vector(1536),
        match_count int DEFAULT 5,
        filter_conversation uuid DEFAULT NULL
      )
      RETURNS TABLE(
        id uuid,
        conversation_id uuid,
        source_type text,
        source_id text,
        text text,
        similarity float,
        chunk_meta jsonb,
        created_at timestamptz
      )
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN QUERY
        SELECT
          e.id,
          e.conversation_id,
          e.source_type,
          e.source_id,
          e.text,
          (1 - (e.embedding <=> query_embedding)) AS similarity,
          e.chunk_meta,
          e.created_at
        FROM ai_embeddings e
        WHERE (filter_conversation IS NULL OR e.conversation_id = filter_conversation)
        ORDER BY e.embedding <=> query_embedding
        LIMIT match_count;
      END;
      $$;
    `;

    const createResult = await supabase.rpc('exec', {
      sql: createSQL
    });
    
    if (createResult.error) {
      console.log('❌ Could not create function via exec:', createResult.error.message);
      console.log('Trying alternative approach...');
      
      // Alternative: Try to execute via a simple query that will fail but might give us info
      const { error: altError } = await supabase
        .from('ai_embeddings')
        .select('*')
        .limit(0);
        
      if (altError) {
        console.log('Database connection issue:', altError.message);
      } else {
        console.log('Database connection is working, but cannot execute DDL statements.');
        console.log('The function needs to be updated manually in the Supabase dashboard.');
        console.log('\nSQL to execute manually:');
        console.log('------------------------');
        console.log(createSQL);
        console.log('------------------------');
      }
    } else {
      console.log('✅ Function created successfully');
    }

    // Test the updated function
    console.log('3. Testing updated function...');
    const testEmbedding = new Array(1536).fill(0.1);
    const { data, error } = await supabase
      .rpc('match_embeddings', {
        query_embedding: testEmbedding,
        match_count: 2,
        filter_conversation: null
      });

    if (error) {
      console.error('❌ Test failed:', error.message);
    } else {
      console.log('✅ Test successful!');
      console.log('Results count:', data?.length || 0);
      
      if (data && data.length > 0) {
        const result = data[0];
        console.log('Available fields:', Object.keys(result));
        console.log('Has similarity field:', 'similarity' in result);
        if ('similarity' in result) {
          console.log('Similarity value:', result.similarity);
          console.log('✅ Function now returns similarity correctly!');
        }
      }
    }

  } catch (error) {
    console.error('❌ Force update error:', error.message);
  }
}

forceUpdateFunction().then(() => {
  console.log('🏁 Force update complete');
});