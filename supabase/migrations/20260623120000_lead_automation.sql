-- Lead automation: per-org, per-flow row that owns the enabled toggle and the
-- email/SMS templates for a given automation. The first flow modeled here is
-- `new_lead_alert`, backfilled from the existing `lead_notification_template`
-- table (kept in place for now; a follow-up migration will retire it).
--
-- Also extends `lead_notification_preference` with two per-user override
-- columns so each team member can route their own alerts to a different
-- email/phone than the one stored on their profile.

-- ── 1. lead_automation ───────────────────────────────────────────────
create table if not exists public.lead_automation (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization (id) on delete cascade,
  flow_key text not null,
  enabled boolean not null default true,
  email_subject text not null default 'New lead: {{lead.name}}',
  email_html text not null default
    '<p>You have a new lead.</p><ul><li><strong>Name:</strong> {{lead.name}}</li><li><strong>Email:</strong> {{lead.email}}</li><li><strong>Phone:</strong> {{lead.phone}}</li><li><strong>Source:</strong> {{lead.source}}</li></ul><p><a href="{{lead.url}}">Open in CRM</a></p>',
  sms_body text not null default
    'New lead {{lead.name}} ({{lead.source}}). Phone: {{lead.phone}}. Open: {{lead.url}}',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

comment on table public.lead_automation is
  'Per-organization, per-flow CRM automation row. flow_key=new_lead_alert mirrors the legacy lead_notification_template; future flows (e.g. deal_won_notify) reuse the same shape.';

create unique index if not exists lead_automation_org_flow_key
  on public.lead_automation (organization_id, flow_key);

alter table public.lead_automation enable row level security;

drop policy if exists "lead_automation_select" on public.lead_automation;
drop policy if exists "lead_automation_insert" on public.lead_automation;
drop policy if exists "lead_automation_update" on public.lead_automation;
drop policy if exists "lead_automation_delete" on public.lead_automation;

create policy "lead_automation_select" on public.lead_automation for select
  using (
    public.is_super_admin()
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
    )
  );

create policy "lead_automation_insert" on public.lead_automation for insert
  with check (
    public.is_super_admin()
    or (
      public.is_team_admin()
      and organization_id = public.current_organization_id()
    )
  );

create policy "lead_automation_update" on public.lead_automation for update
  using (
    public.is_super_admin()
    or (
      public.is_team_admin()
      and organization_id = public.current_organization_id()
    )
  )
  with check (
    public.is_super_admin()
    or (
      public.is_team_admin()
      and organization_id = public.current_organization_id()
    )
  );

create policy "lead_automation_delete" on public.lead_automation for delete
  using (
    public.is_super_admin()
    or (
      public.is_team_admin()
      and organization_id = public.current_organization_id()
    )
  );

-- ── 2. Per-user override email + phone for new-lead alerts ───────────
alter table public.lead_notification_preference
  add column if not exists override_email text,
  add column if not exists override_phone text;

comment on column public.lead_notification_preference.override_email is
  'Per-user override for email notifications. NULL falls back to profiles.email.';
comment on column public.lead_notification_preference.override_phone is
  'Per-user override for SMS notifications. NULL falls back to sms_phone (legacy) then profiles.phone.';

-- ── 3. Backfill new_lead_alert rows from lead_notification_template ──
insert into public.lead_automation (
  organization_id,
  flow_key,
  enabled,
  email_subject,
  email_html,
  sms_body,
  updated_at
)
select
  t.organization_id,
  'new_lead_alert',
  true,
  coalesce(nullif(t.email_subject, ''), 'New lead: {{lead.name}}'),
  coalesce(nullif(t.email_html, ''),
    '<p>You have a new lead.</p><ul><li><strong>Name:</strong> {{lead.name}}</li><li><strong>Email:</strong> {{lead.email}}</li><li><strong>Phone:</strong> {{lead.phone}}</li><li><strong>Source:</strong> {{lead.source}}</li></ul><p><a href="{{lead.url}}">Open in CRM</a></p>'),
  coalesce(nullif(t.sms_body, ''),
    'New lead {{lead.name}} ({{lead.source}}). Phone: {{lead.phone}}. Open: {{lead.url}}'),
  coalesce(t.updated_at, now())
from public.lead_notification_template t
on conflict (organization_id, flow_key) do nothing;

-- Also seed any organization that doesn't yet have a template row, so the
-- automation editor always has something to load.
insert into public.lead_automation (organization_id, flow_key)
select o.id, 'new_lead_alert'
from public.organization o
where not exists (
  select 1
  from public.lead_automation la
  where la.organization_id = o.id
    and la.flow_key = 'new_lead_alert'
)
on conflict (organization_id, flow_key) do nothing;

-- ── 4. Seed new orgs going forward ───────────────────────────────────
create or replace function public.organization_seed_lead_automation_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.lead_automation (organization_id, flow_key)
  values (new.id, 'new_lead_alert')
  on conflict (organization_id, flow_key) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_organization_seed_lead_automation_defaults on public.organization;
create trigger trg_organization_seed_lead_automation_defaults
  after insert on public.organization
  for each row execute function public.organization_seed_lead_automation_defaults();
