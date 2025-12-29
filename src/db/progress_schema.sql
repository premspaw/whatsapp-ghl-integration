-- ==========================================
-- 4. SKIN ANALYSIS PROGRESS TRACKING
-- ==========================================

create table if not exists public.skin_analyses (
  id uuid default gen_random_uuid() primary key,
  location_id text not null references public.ghl_integrations(location_id) on delete cascade,
  contact_id text not null,
  analysis_data jsonb not null,
  image_url text, -- Store base64 or a link to an external image
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS
alter table public.skin_analyses enable row level security;

-- Policy for Service Role
do $$ 
begin
  if not exists (select 1 from pg_policies where policyname = 'Allow all for service role on skin_analyses' and tablename = 'skin_analyses') then
    create policy "Allow all for service role on skin_analyses" 
    on public.skin_analyses 
    for all 
    to service_role 
    using (true) 
    with check (true);
  end if;
end $$;
