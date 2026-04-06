-- Singleton SendGrid integration for agency CRM outbound email (API key encrypted at app layer).

create table public.agency_sendgrid_integration (
  id smallint primary key default 1 check (id = 1),
  api_key_encrypted text,
  from_email text,
  from_name text,
  reply_to text,
  test_destination_email text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

comment on table public.agency_sendgrid_integration is 'Agency-wide SendGrid API key (encrypted) and verified sender; used for transactional CRM email.';

insert into public.agency_sendgrid_integration (id) values (1)
on conflict (id) do nothing;

alter table public.agency_sendgrid_integration enable row level security;

create policy "agency_staff_sendgrid_select"
  on public.agency_sendgrid_integration for select
  using (public.is_agency_staff());

create policy "agency_staff_sendgrid_insert"
  on public.agency_sendgrid_integration for insert
  with check (public.is_agency_staff());

create policy "agency_staff_sendgrid_update"
  on public.agency_sendgrid_integration for update
  using (public.is_agency_staff())
  with check (public.is_agency_staff());
