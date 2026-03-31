-- Ordered activity ids shown in the pinned "Priorities" section (references activities in categories JSON).
alter table public.user_prospecting_playbook
  add column if not exists priority_activity_ids jsonb not null default '[]'::jsonb;
