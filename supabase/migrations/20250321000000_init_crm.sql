-- Agency CRM schema + RLS. Run in Supabase SQL Editor or via `supabase db push`.
--
-- Supabase may warn: "Query has destructive operations". That is expected:
--   - DROP TRIGGER IF EXISTS … only removes the signup trigger so re-runs don’t conflict.
--   - CREATE OR REPLACE FUNCTION replaces handle_new_user if you re-apply.
-- It does NOT drop your CRM tables or data. Safe on a fresh project; do not re-run the
-- full file on a DB that already has these tables (use migrations / incremental SQL instead).

-- Extensions
create extension if not exists "pgcrypto";

-- Core entities (order matters for FKs)
create table public.client (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  company text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.lead (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  company text,
  source text,
  stage text not null default 'new',
  notes text,
  owner_id uuid references auth.users (id) on delete set null,
  converted_client_id uuid references public.client (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.project (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.client (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'active',
  assigned_to uuid references auth.users (id) on delete set null,
  start_date date,
  target_date date,
  created_at timestamptz not null default now()
);

create table public.task (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo',
  sort_order int not null default 0,
  client_visible boolean not null default false,
  assigned_to uuid references auth.users (id) on delete set null,
  due_date date,
  created_at timestamptz not null default now()
);

create table public.appointment (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  lead_id uuid references public.lead (id) on delete set null,
  client_id uuid references public.client (id) on delete set null,
  project_id uuid references public.project (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.transaction (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('revenue', 'expense')),
  amount numeric(12, 2) not null,
  category text,
  description text,
  date date not null default (current_date),
  project_id uuid references public.project (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.goal (
  id uuid primary key default gen_random_uuid(),
  metric text not null,
  period text not null,
  target numeric(12, 2) not null,
  actual numeric(12, 2) not null default 0,
  period_start date not null,
  created_at timestamptz not null default now()
);

-- Profile per auth user
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'agency_member'
    check (role in ('agency_admin', 'agency_member', 'client')),
  client_id uuid references public.client (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(
      nullif(new.raw_user_meta_data->>'role', ''),
      'agency_member'
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.client enable row level security;
alter table public.lead enable row level security;
alter table public.project enable row level security;
alter table public.task enable row level security;
alter table public.appointment enable row level security;
alter table public.transaction enable row level security;
alter table public.goal enable row level security;
alter table public.profiles enable row level security;

-- Helper: is agency staff
-- Policies: agency_admin / agency_member — full CRUD on internal tables
create policy "agency_all_client"
  on public.client for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('agency_admin', 'agency_member')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('agency_admin', 'agency_member')
    )
  );

create policy "agency_all_lead"
  on public.lead for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('agency_admin', 'agency_member')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('agency_admin', 'agency_member')
    )
  );

create policy "agency_all_project"
  on public.project for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('agency_admin', 'agency_member')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('agency_admin', 'agency_member')
    )
  );

create policy "agency_all_task"
  on public.task for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('agency_admin', 'agency_member')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('agency_admin', 'agency_member')
    )
  );

create policy "agency_all_appointment"
  on public.appointment for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('agency_admin', 'agency_member')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('agency_admin', 'agency_member')
    )
  );

create policy "agency_all_transaction"
  on public.transaction for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('agency_admin', 'agency_member')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('agency_admin', 'agency_member')
    )
  );

create policy "agency_all_goal"
  on public.goal for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('agency_admin', 'agency_member')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('agency_admin', 'agency_member')
    )
  );

-- Client: read own projects
create policy "client_select_project"
  on public.project for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'client'
        and p.client_id = project.client_id
    )
  );

-- Client: read visible tasks on own projects
create policy "client_select_task"
  on public.task for select
  using (
    task.client_visible = true
    and exists (
      select 1
      from public.project pr
      join public.profiles p on p.client_id = pr.client_id
      where pr.id = task.project_id
        and p.id = auth.uid()
        and p.role = 'client'
    )
  );

-- Profiles: users read/update self
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Agency can read all profiles (for assignment UI)
create policy "agency_select_profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('agency_admin', 'agency_member')
    )
  );
