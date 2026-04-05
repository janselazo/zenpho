-- Prospect website previews (LLM HTML) + Google listing category on leads.

create table if not exists public.prospect_preview (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  html text not null,
  place_google_id text,
  business_name text not null default '',
  business_address text,
  primary_category text,
  screenshot_url text,
  screenshot_status text not null default 'pending'
    check (screenshot_status in ('pending', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prospect_preview_user_created_idx
  on public.prospect_preview (user_id, created_at desc);

alter table public.prospect_preview enable row level security;

create policy "agency_all_prospect_preview"
  on public.prospect_preview for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

grant select, insert, update, delete on public.prospect_preview to authenticated;

alter table public.lead
  add column if not exists google_business_category text,
  add column if not exists google_place_types text[];
