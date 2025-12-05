-- Multi-tenant support for RAG system
-- Adds tenants table and tenant_id to core tables

-- Tenants registry
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp_number text,
  ghl_location_id text,
  ghl_account_id text,
  ghl_api_key text,
  webhook_secret text,
  created_at timestamptz default now()
);

-- Add tenant_id to embeddings
alter table if exists public.ai_embeddings
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

create index if not exists ai_embeddings_tenant_idx on public.ai_embeddings(tenant_id);

-- Add tenant_id to conversations and messages (nullable for backward compatibility)
alter table if exists public.conversations
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

alter table if exists public.messages
  add column if not exists tenant_id uuid references public.tenants(id) on delete cascade;

-- Update match_embeddings to support optional tenant filtering
create or replace function public.match_embeddings(
  query_embedding vector(1536),
  match_count integer default 5,
  filter_conversation uuid default null,
  filter_tenant uuid default null
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
    and (filter_tenant is null or e.tenant_id = filter_tenant)
  order by e.embedding <=> query_embedding
  limit match_count;
$$;