-- Appointment reminder: second `flow_key` of the `lead_automation` table, plus
-- per-user reminder preferences and an idempotency log.

insert into public.lead_automation (
  organization_id,
  flow_key,
  enabled,
  email_subject,
  email_html,
  sms_body
)
select
  o.id,
  'appointment_reminder',
  true,
  'Reminder: {{appointment.title}} {{appointment.startsRelative}}',
  '<p>Heads up - your appointment is coming up.</p>'
    || '<ul>'
    || '<li><strong>What:</strong> {{appointment.title}}</li>'
    || '<li><strong>When:</strong> {{appointment.startsAt}} ({{appointment.startsRelative}})</li>'
    || '<li><strong>Lead:</strong> {{lead.name}}</li>'
    || '<li><strong>Phone:</strong> {{lead.phone}}</li>'
    || '</ul>'
    || '<p><a href="{{appointment.url}}">Open in CRM</a></p>',
  'Reminder: {{appointment.title}} at {{appointment.startsAt}}. Lead: {{lead.name}}. {{appointment.url}}'
from public.organization o
where not exists (
  select 1
  from public.lead_automation la
  where la.organization_id = o.id
    and la.flow_key = 'appointment_reminder'
)
on conflict (organization_id, flow_key) do nothing;

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

  insert into public.lead_automation (
    organization_id,
    flow_key,
    enabled,
    email_subject,
    email_html,
    sms_body
  ) values (
    new.id,
    'appointment_reminder',
    true,
    'Reminder: {{appointment.title}} {{appointment.startsRelative}}',
    '<p>Heads up - your appointment is coming up.</p>'
      || '<ul>'
      || '<li><strong>What:</strong> {{appointment.title}}</li>'
      || '<li><strong>When:</strong> {{appointment.startsAt}} ({{appointment.startsRelative}})</li>'
      || '<li><strong>Lead:</strong> {{lead.name}}</li>'
      || '<li><strong>Phone:</strong> {{lead.phone}}</li>'
      || '</ul>'
      || '<p><a href="{{appointment.url}}">Open in CRM</a></p>',
    'Reminder: {{appointment.title}} at {{appointment.startsAt}}. Lead: {{lead.name}}. {{appointment.url}}'
  )
  on conflict (organization_id, flow_key) do nothing;

  return new;
end;
$$;

create or replace function public.appointment_reminder_minutes_valid(arr jsonb)
returns boolean
language sql
immutable
as $$
  select case
    when arr is null then true
    when jsonb_typeof(arr) <> 'array' then false
    else coalesce(
      (
        select bool_and(
          jsonb_typeof(v) = 'number' and (v::text)::int > 0
        )
        from jsonb_array_elements(arr) as v
      ),
      true
    )
  end
$$;

create table if not exists public.appointment_reminder_preference (
  user_id uuid primary key references auth.users (id) on delete cascade,
  lead_minutes_before jsonb not null default '[15]'::jsonb,
  override_email text,
  override_phone text,
  updated_at timestamptz not null default now(),
  constraint appointment_reminder_preference_lead_minutes_check
    check (public.appointment_reminder_minutes_valid(lead_minutes_before))
);

comment on table public.appointment_reminder_preference is
  'Per-user opt-in for appointment reminders: which lead-time windows to receive and where to deliver them.';

alter table public.appointment_reminder_preference enable row level security;

drop policy if exists "appointment_reminder_preference_select_self" on public.appointment_reminder_preference;
drop policy if exists "appointment_reminder_preference_select_admin" on public.appointment_reminder_preference;
drop policy if exists "appointment_reminder_preference_modify_self" on public.appointment_reminder_preference;

create policy "appointment_reminder_preference_select_self"
  on public.appointment_reminder_preference for select
  using (user_id = auth.uid());

create policy "appointment_reminder_preference_select_admin"
  on public.appointment_reminder_preference for select
  using (
    public.is_super_admin()
    or (
      public.is_team_admin()
      and exists (
        select 1
        from public.profiles p
        where p.id = appointment_reminder_preference.user_id
          and p.organization_id = public.current_organization_id()
      )
    )
  );

create policy "appointment_reminder_preference_modify_self"
  on public.appointment_reminder_preference for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.appointment_reminder_log (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointment (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  lead_minutes integer not null,
  appointment_starts_at timestamptz not null,
  fired_at timestamptz not null default now(),
  email_status text,
  sms_status text,
  error text
);

comment on table public.appointment_reminder_log is
  'Idempotency and audit trail for appointment reminder dispatches.';

create unique index if not exists appointment_reminder_log_idem
  on public.appointment_reminder_log (
    appointment_id, user_id, lead_minutes, appointment_starts_at
  );

create index if not exists appointment_reminder_log_appt_idx
  on public.appointment_reminder_log (appointment_id);

create index if not exists appointment_reminder_log_user_idx
  on public.appointment_reminder_log (user_id, fired_at desc);

alter table public.appointment_reminder_log enable row level security;

drop policy if exists "appointment_reminder_log_select_self" on public.appointment_reminder_log;
drop policy if exists "appointment_reminder_log_select_admin" on public.appointment_reminder_log;

create policy "appointment_reminder_log_select_self"
  on public.appointment_reminder_log for select
  using (user_id = auth.uid());

create policy "appointment_reminder_log_select_admin"
  on public.appointment_reminder_log for select
  using (
    public.is_super_admin()
    or (
      public.is_team_admin()
      and exists (
        select 1
        from public.profiles p
        where p.id = appointment_reminder_log.user_id
          and p.organization_id = public.current_organization_id()
      )
    )
  );
