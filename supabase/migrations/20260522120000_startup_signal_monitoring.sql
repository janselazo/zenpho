-- Durable Startup Signal Monitoring hits and run history.

create table if not exists public.prospect_signal_hit (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  source_item_id text not null,
  source_label text not null,
  channel text not null,
  title text not null,
  excerpt text,
  url text not null,
  author_name text,
  author_url text,
  company text,
  company_domain text,
  posted_at timestamptz,
  detected_at timestamptz not null default now(),
  fit_score integer not null default 0 check (fit_score >= 0 and fit_score <= 100),
  fit_tier text not null default 'cold' check (fit_tier in ('hot', 'warm', 'cold')),
  fit_breakdown jsonb not null default '[]'::jsonb,
  intent_keys text[] not null default '{}'::text[],
  raw_payload jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'reviewed', 'lead_created', 'dismissed')),
  lead_id uuid references public.lead (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prospect_signal_hit_source_item_unique unique (source, source_item_id)
);

create index if not exists prospect_signal_hit_detected_idx
  on public.prospect_signal_hit (detected_at desc);

create index if not exists prospect_signal_hit_source_detected_idx
  on public.prospect_signal_hit (source, detected_at desc);

create index if not exists prospect_signal_hit_fit_idx
  on public.prospect_signal_hit (fit_tier, fit_score desc);

create index if not exists prospect_signal_hit_status_idx
  on public.prospect_signal_hit (status, detected_at desc);

create table if not exists public.prospect_signal_monitor_run (
  id uuid primary key default gen_random_uuid(),
  source_group text not null,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  warning text,
  error text,
  filters jsonb not null default '{}'::jsonb
);

create index if not exists prospect_signal_monitor_run_started_idx
  on public.prospect_signal_monitor_run (started_at desc);

alter table public.prospect_signal_hit enable row level security;
alter table public.prospect_signal_monitor_run enable row level security;

create policy "agency_all_prospect_signal_hit"
  on public.prospect_signal_hit for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

create policy "agency_all_prospect_signal_monitor_run"
  on public.prospect_signal_monitor_run for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

grant select, insert, update, delete on public.prospect_signal_hit to authenticated;
grant select, insert, update, delete on public.prospect_signal_monitor_run to authenticated;
