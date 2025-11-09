const { getSupabase } = require('./supabaseClient');

async function insertEmbedding({ conversationId = null, sourceType, sourceId, text, embedding, chunkMeta = {}, tenantId = null }) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const payload = {
    conversation_id: conversationId,
    source_type: sourceType,
    source_id: sourceId,
    text,
    embedding,
    chunk_meta: chunkMeta,
    tenant_id: tenantId
  };
  const { data, error } = await supabase
    .from('ai_embeddings')
    .insert(payload)
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function matchEmbeddings({ queryEmbedding, matchCount = 5, conversationId = null, tenantId = null }) {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .rpc('match_embeddings', {
      query_embedding: queryEmbedding,
      match_count: matchCount,
      filter_conversation: conversationId,
      filter_tenant: tenantId
    });
  if (error) throw new Error(error.message);
  return data || [];
}

module.exports = { insertEmbedding, matchEmbeddings };


