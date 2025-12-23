-- Create table for GHL Integrations
create table if not exists public.ghl_integrations (
  id uuid default gen_random_uuid() primary key,
  location_id text not null unique,
  access_token text not null,
  refresh_token text not null,
  expires_at bigint not null,
  user_type text,
  company_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS
alter table public.ghl_integrations enable row level security;

-- Allow all access for service role (server-side)
create policy "Allow all for service role"
on public.ghl_integrations
for all
to service_role
using (true)
with check (true);

-- Allow read access for authenticated users (dashboard) if matches company/user
-- (For now we can leave this open or restricted to service role if only server accesses it)
