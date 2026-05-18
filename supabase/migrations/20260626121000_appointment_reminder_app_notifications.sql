-- Appointment reminder channels + in-app notification persistence.

alter table public.appointment_reminder_preference
  add column if not exists email_enabled boolean not null default true,
  add column if not exists sms_enabled boolean not null default false,
  add column if not exists app_enabled boolean not null default true;

alter table public.appointment_reminder_log
  add column if not exists app_status text;

create table if not exists public.app_notification (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organization (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  href text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.app_notification is
  'Persistent in-app notifications shown in the CRM bell/dropdown and realtime toasts.';

create index if not exists app_notification_user_unread_idx
  on public.app_notification (user_id, read_at, created_at desc);

create index if not exists app_notification_org_created_idx
  on public.app_notification (organization_id, created_at desc);

alter table public.app_notification enable row level security;

drop policy if exists "app_notification_select_self" on public.app_notification;
drop policy if exists "app_notification_update_self" on public.app_notification;
drop policy if exists "app_notification_select_admin" on public.app_notification;

create policy "app_notification_select_self"
  on public.app_notification for select
  using (user_id = auth.uid());

create policy "app_notification_update_self"
  on public.app_notification for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "app_notification_select_admin"
  on public.app_notification for select
  using (
    public.is_super_admin()
    or (
      public.is_team_admin()
      and organization_id = public.current_organization_id()
    )
  );
