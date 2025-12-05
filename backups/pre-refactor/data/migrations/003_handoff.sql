create table if not exists public.handoff_requests (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  conversation_ref text,
  summary text,
  status text not null default 'open' check (status in ('open','assigned','resolved')),
  assigned_to text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_handoff_status on public.handoff_requests (status);
create index if not exists idx_handoff_phone on public.handoff_requests (phone);


