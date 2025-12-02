-- Requires: create extension if not exists vector;
-- Search function for pgvector cosine distance
create or replace function public.match_embeddings(
  query_embedding vector(1536),
  match_count integer default 5,
  filter_conversation uuid default null
)
returns table (
  id uuid,
  conversation_id uuid,
  source_type text,
  source_id text,
  text text,
  similarity float4,
  chunk_meta jsonb,
  created_at timestamptz
) language sql stable as $$
  select e.id,
         e.conversation_id,
         e.source_type,
         e.source_id,
         e.text,
         (1 - (e.embedding <=> query_embedding)) as similarity,
         e.chunk_meta,
         e.created_at
  from public.ai_embeddings e
  where (filter_conversation is null or e.conversation_id = filter_conversation)
  order by e.embedding <=> query_embedding
  limit match_count;
$$;

-- Optional: index for faster ANN search (requires pgvector ivfflat)
-- create index if not exists ai_embeddings_embedding_idx on public.ai_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

