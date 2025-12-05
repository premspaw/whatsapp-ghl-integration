-- Supabase migration: Accounts table and summary view
-- Includes created_at in accounts_summary to avoid missing column errors

-- Enable required extension for UUID generation (usually present in Supabase)
create extension if not exists "pgcrypto";

-- Create accounts table to store per-location/number configuration
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  -- Human-readable name for this account (e.g., "Synthcore Main WA")
  name text,

  -- Link to tenants table if present; nullable to allow bootstrap
  tenant_id uuid,

  -- GHL location identifier (external id string); one account per location
  ghl_location_id text,

  -- WhatsApp number in E.164 format (e.g., +918123133382)
  whatsapp_number text,

  -- Vector namespace for RAG, e.g., "location_123" or per-number index
  vector_namespace text,

  -- LLM tag or model id, e.g., "fast", "quality", or a specific model name
  llm_tag text,

  -- Free-form JSON for additional config
  metadata jsonb,

  -- Auditing timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Basic indexes for fast lookup
create index if not exists idx_accounts_tenant_id on public.accounts(tenant_id);
create index if not exists idx_accounts_location_id on public.accounts(ghl_location_id);
create index if not exists idx_accounts_whatsapp_number on public.accounts(whatsapp_number);

-- Ensure unique per GHL location when present
create unique index if not exists accounts_unique_ghl_location
  on public.accounts(ghl_location_id)
  where ghl_location_id is not null;

-- Ensure unique WhatsApp number when present
create unique index if not exists accounts_unique_whatsapp_number
  on public.accounts(whatsapp_number)
  where whatsapp_number is not null;

-- Optional FK if tenants table exists (do not error if not present)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'tenants'
  ) then
    alter table public.accounts
      add constraint accounts_tenant_fk foreign key (tenant_id)
      references public.tenants(id)
      on delete set null;
  end if;
end $$;

-- Keep updated_at in sync on update
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

-- Summary view including created_at
drop view if exists public.accounts_summary;
create or replace view public.accounts_summary as
  select
    a.id,
    a.name,
    a.whatsapp_number,
    a.ghl_location_id,
    a.vector_namespace,
    a.llm_tag,
    a.metadata,
    a.created_at,
    a.updated_at,
    t.id as tenant_id,
    t.name as tenant_name,
    t.external_id as tenant_external_id
  from public.accounts a
  left join public.tenants t on t.id = a.tenant_id;

-- Example seed (commented)
-- insert into public.accounts (name, tenant_id, ghl_location_id, whatsapp_number, vector_namespace, llm_tag)
-- values ('Synthcore Main WA', null, 'location_123', '+918123133382', 'location_123', 'quality');