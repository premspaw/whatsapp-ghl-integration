-- Align tenants schema with code expectations
-- Adds missing columns and helpful indexes used by the app

-- Add external_id and metadata columns if not present
alter table if exists public.tenants
  add column if not exists external_id text,
  add column if not exists metadata jsonb default '{}'::jsonb;

-- Helpful indexes for common lookups
create index if not exists tenants_external_id_idx on public.tenants(external_id);
create index if not exists tenants_metadata_whatsapp_idx on public.tenants((metadata ->> 'whatsapp_number'));
create index if not exists tenants_metadata_primary_phone_idx on public.tenants((metadata ->> 'primary_phone'));
create index if not exists tenants_metadata_phone_idx on public.tenants((metadata ->> 'phone'));
create index if not exists tenants_metadata_location_idx on public.tenants((metadata ->> 'ghl_location_id'));

-- Note: RLS policies should allow reads for service_role key.
-- If row-level security is enabled, ensure appropriate policies exist for server-side operations.