-- Shared Kanban pipeline definitions for Leads + Deals (singleton row).
-- Empty arrays in JSON mean "use app defaults" (see merge*FromDb in code).

create table if not exists public.crm_settings (
  id int primary key default 1,
  lead_pipeline jsonb not null default '[]'::jsonb,
  deal_pipeline jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint crm_settings_singleton check (id = 1)
);

insert into public.crm_settings (id) values (1)
on conflict (id) do nothing;

alter table public.crm_settings enable row level security;

create policy "agency_crm_settings_all"
  on public.crm_settings for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

-- Allow arbitrary deal stage slugs (validated in app against crm_settings + defaults).
alter table public.deal drop constraint if exists deal_stage_check;
