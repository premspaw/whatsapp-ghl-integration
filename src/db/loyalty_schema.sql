-- ==========================================
-- 1. BASE GHL INTEGRATIONS (Dependency)
-- ==========================================
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

alter table public.ghl_integrations enable row level security;

do $$ 
begin
  if not exists (select 1 from pg_policies where policyname = 'Allow all for service role' and tablename = 'ghl_integrations') then
    create policy "Allow all for service role" on public.ghl_integrations for all to service_role using (true) with check (true);
  end if;
end $$;

-- ==========================================
-- 2. LOYALTY SYSTEM TABLES
-- ==========================================

-- Loyalty Settings (Multi-tenant Branding)
create table if not exists public.loyalty_settings (
  id uuid default gen_random_uuid() primary key,
  location_id text not null unique references public.ghl_integrations(location_id) on delete cascade,
  business_name text not null,
  logo_url text,
  banner_url text,
  primary_color text default '#14b8a6',
  secondary_color text default '#fb7185',
  address text,
  phone text,
  website text,
  hours text,
  review_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Loyalty Milestones (Per-location Roadmap)
create table if not exists public.loyalty_milestones (
  id uuid default gen_random_uuid() primary key,
  location_id text not null references public.ghl_integrations(location_id) on delete cascade,
  visit_number integer not null,
  reward_name text not null,
  reward_image text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(location_id, visit_number)
);

-- Loyalty Customers (Mapped to GHL Contacts)
create table if not exists public.loyalty_customers (
  id uuid default gen_random_uuid() primary key,
  location_id text not null references public.ghl_integrations(location_id) on delete cascade,
  contact_id text not null, -- GHL Contact ID
  email text,
  name text,
  avatar_url text,
  total_visits integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(location_id, contact_id)
);

-- Loyalty Visits (History Log)
create table if not exists public.loyalty_visits (
  id uuid default gen_random_uuid() primary key,
  location_id text not null references public.ghl_integrations(location_id) on delete cascade,
  contact_id text not null,
  visit_date timestamp with time zone default timezone('utc'::text, now()) not null,
  points_earned integer default 1,
  metadata jsonb default '{}'::jsonb
);

-- Loyalty Claims (Rewards History)
create table if not exists public.loyalty_claims (
  id uuid default gen_random_uuid() primary key,
  location_id text not null references public.ghl_integrations(location_id) on delete cascade,
  contact_id text not null,
  milestone_id uuid references public.loyalty_milestones(id) on delete cascade,
  claimed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  verification_code text,
  is_verified boolean default false
);

-- Loyalty Actions (Review, Share, etc.)
create table if not exists public.loyalty_actions (
  id uuid default gen_random_uuid() primary key,
  location_id text not null references public.ghl_integrations(location_id) on delete cascade,
  action_type text not null, -- 'review', 'share', etc.
  reward_name text not null,
  action_url text,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 3. RLS POLICIES
-- ==========================================

alter table public.loyalty_settings enable row level security;
alter table public.loyalty_milestones enable row level security;
alter table public.loyalty_customers enable row level security;
alter table public.loyalty_visits enable row level security;
alter table public.loyalty_claims enable row level security;
alter table public.loyalty_actions enable row level security;

do $$ 
begin
  -- Settings
  if not exists (select 1 from pg_policies where policyname = 'Allow all for service role on settings' and tablename = 'loyalty_settings') then
    create policy "Allow all for service role on settings" on public.loyalty_settings for all to service_role using (true) with check (true);
  end if;
  
  -- Milestones
  if not exists (select 1 from pg_policies where policyname = 'Allow all for service role on milestones' and tablename = 'loyalty_milestones') then
    create policy "Allow all for service role on milestones" on public.loyalty_milestones for all to service_role using (true) with check (true);
  end if;

  -- Customers
  if not exists (select 1 from pg_policies where policyname = 'Allow all for service role on customers' and tablename = 'loyalty_customers') then
    create policy "Allow all for service role on customers" on public.loyalty_customers for all to service_role using (true) with check (true);
  end if;

  -- Visits
  if not exists (select 1 from pg_policies where policyname = 'Allow all for service role on visits' and tablename = 'loyalty_visits') then
    create policy "Allow all for service role on visits" on public.loyalty_visits for all to service_role using (true) with check (true);
  end if;

  -- Claims
  if not exists (select 1 from pg_policies where policyname = 'Allow all for service role on claims' and tablename = 'loyalty_claims') then
    create policy "Allow all for service role on claims" on public.loyalty_claims for all to service_role using (true) with check (true);
  end if;

  -- Actions
  if not exists (select 1 from pg_policies where policyname = 'Allow all for service role on actions' and tablename = 'loyalty_actions') then
    create policy "Allow all for service role on actions" on public.loyalty_actions for all to service_role using (true) with check (true);
  end if;
end $$;
