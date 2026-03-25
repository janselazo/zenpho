-- Time tracking: entries linked to optional project/task, scoped to the logged-in user.
-- Apply with: `npx supabase link` then `npx supabase db push`, or paste this file in Supabase Dashboard → SQL Editor.

create table if not exists public.time_entry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.project (id) on delete set null,
  task_id uuid references public.task (id) on delete set null,
  description text not null default '',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  billable boolean not null default true,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists time_entry_user_started_idx
  on public.time_entry (user_id, started_at desc);

-- At most one running (open) entry per user
create unique index if not exists time_entry_one_running_per_user_idx
  on public.time_entry (user_id)
  where (ended_at is null);

alter table public.time_entry enable row level security;

drop policy if exists "time_entry_select_own" on public.time_entry;
create policy "time_entry_select_own"
  on public.time_entry for select
  using (auth.uid() = user_id);

drop policy if exists "time_entry_insert_own" on public.time_entry;
create policy "time_entry_insert_own"
  on public.time_entry for insert
  with check (auth.uid() = user_id);

drop policy if exists "time_entry_update_own" on public.time_entry;
create policy "time_entry_update_own"
  on public.time_entry for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "time_entry_delete_own" on public.time_entry;
create policy "time_entry_delete_own"
  on public.time_entry for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.time_entry to authenticated;
