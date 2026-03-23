-- Per-user Prospecting Playbook (sections + activities + daily completion counts).
-- Replaces browser-only persistence for authenticated users.

create table public.user_prospecting_playbook (
  user_id uuid primary key references auth.users (id) on delete cascade,
  categories jsonb not null default '[]'::jsonb,
  completions jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index user_prospecting_playbook_updated_at_idx
  on public.user_prospecting_playbook (updated_at desc);

alter table public.user_prospecting_playbook enable row level security;

create policy "user_prospecting_playbook_select_own"
  on public.user_prospecting_playbook for select
  using (auth.uid() = user_id);

create policy "user_prospecting_playbook_insert_own"
  on public.user_prospecting_playbook for insert
  with check (auth.uid() = user_id);

create policy "user_prospecting_playbook_update_own"
  on public.user_prospecting_playbook for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_prospecting_playbook_delete_own"
  on public.user_prospecting_playbook for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_prospecting_playbook to authenticated;
