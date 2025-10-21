-- Enable pgvector for embedding column types
create extension if not exists vector;

-- Contacts table
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  ghl_contact_id text,
  name text,
  metadata jsonb default '{}'::jsonb,
  last_seen_at timestamptz,
  created_at timestamptz default now()
);

-- Conversations table
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts(id) on delete cascade,
  ghl_location_id text,
  channel text check (channel in ('whatsapp','sms','email')) default 'whatsapp',
  last_message_at timestamptz,
  created_at timestamptz default now()
);

-- Messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  direction text check (direction in ('INCOMING','OUTGOING')) not null,
  provider_message_id text,
  content text,
  media jsonb default '[]'::jsonb,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  delivered_at timestamptz
);

-- Short-term AI memory
create table if not exists public.ai_conversation_memory (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  role text check (role in ('user','assistant','system')) not null,
  text text not null,
  tokens int,
  created_at timestamptz default now()
);

-- Embeddings (requires pgvector extension)
-- Enable manually in Supabase: create extension if not exists vector;
create table if not exists public.ai_embeddings (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete set null,
  source_type text,
  source_id text,
  text text,
  embedding vector(1536),
  chunk_meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Training sources
create table if not exists public.training_sources (
  id uuid primary key default gen_random_uuid(),
  type text,
  url text,
  last_crawled_at timestamptz,
  status text,
  created_at timestamptz default now()
);

-- Events queue for retries
create table if not exists public.events_queue (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  payload jsonb not null,
  attempts int default 0,
  next_attempt_at timestamptz default now(),
  created_at timestamptz default now()
);

-- AI models config
create table if not exists public.ai_models (
  id uuid primary key default gen_random_uuid(),
  provider text,
  model_name text,
  temperature numeric,
  system_prompt_template text,
  created_at timestamptz default now()
);

-- Helpful indexes
create index if not exists idx_contacts_phone on public.contacts (phone);
create index if not exists idx_messages_conversation_id on public.messages (conversation_id);
create index if not exists idx_messages_contact_id on public.messages (contact_id);
create index if not exists idx_embeddings_conversation_id on public.ai_embeddings (conversation_id);
create index if not exists idx_conversations_contact_id on public.conversations (contact_id);


