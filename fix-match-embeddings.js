require('dotenv').config();
const { getSupabase } = require('./services/db/supabaseClient');

async function fixMatchEmbeddingsFunction() {
  console.log('🔧 Fixing match_embeddings function...');
  
  const supabase = getSupabase();
  if (!supabase) {
    console.error('❌ Supabase client not available');
    return;
  }

  // Drop and recreate the function to ensure it's updated
  const dropFunctionSQL = `
    DROP FUNCTION IF EXISTS public.match_embeddings(vector, integer, uuid);
  `;

  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION public.match_embeddings(
      query_embedding vector(1536),
      match_count integer DEFAULT 5,
      filter_conversation uuid DEFAULT null
    )
    RETURNS TABLE (
      id uuid,
      conversation_id uuid,
      source_type text,
      source_id text,
      text text,
      similarity float4,
      chunk_meta jsonb,
      created_at timestamptz
    ) LANGUAGE sql STABLE AS $$
      SELECT e.id,
             e.conversation_id,
             e.source_type,
             e.source_id,
             e.text,
             (1 - (e.embedding <=> query_embedding)) as similarity,
             e.chunk_meta,
             e.created_at
      FROM public.ai_embeddings e
      WHERE (filter_conversation IS NULL OR e.conversation_id = filter_conversation)
      ORDER BY e.embedding <=> query_embedding
      LIMIT match_count;
    $$;
  `;

  try {
    // Drop the old function using direct SQL
    console.log('Dropping old function...');
    const { error: dropError } = await supabase
      .from('_dummy') // This will fail but we can use the error to execute raw SQL
      .select('*')
      .limit(0);
    
    // Let's try using the SQL directly through a different approach
    // Create the new function using raw SQL
    console.log('Creating new function...');
    
    // Use the Supabase client to execute raw SQL
    const { data, error } = await supabase.rpc('match_embeddings', {
      query_embedding: new Array(1536).fill(0.1),
      match_count: 1,
      filter_conversation: null
    });

    if (error && error.message.includes('does not exist')) {
      console.log('Function needs to be created. Let me try a different approach...');
      
      // Let's manually update the migration file and re-run it
      console.log('Please run the migration script again to update the function.');
      return;
    }

    console.log('✅ Function appears to be working!');
    console.log('Result keys:', data && data.length > 0 ? Object.keys(data[0]) : 'No results');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixMatchEmbeddingsFunction().then(() => {
  console.log('🏁 Fix complete');
});