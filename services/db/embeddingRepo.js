const { getSupabase } = require('./supabaseClient');

async function insertEmbedding({ conversationId = null, sourceType, sourceId, text, embedding, chunkMeta = {} }) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const payload = {
    conversation_id: conversationId,
    source_type: sourceType,
    source_id: sourceId,
    text,
    embedding,
    chunk_meta: chunkMeta
  };
  const { data, error } = await supabase
    .from('ai_embeddings')
    .insert(payload)
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function matchEmbeddings({ queryEmbedding, matchCount = 5, conversationId = null }) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .rpc('match_embeddings', {
      query_embedding: queryEmbedding,
      match_count: matchCount,
      filter_conversation: conversationId
    });
  if (error) throw new Error(error.message);
  return data || [];
}

module.exports = { insertEmbedding, matchEmbeddings };


