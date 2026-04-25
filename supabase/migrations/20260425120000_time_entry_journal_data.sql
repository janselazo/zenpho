-- Playbook → Money Journal: full payload stored on completed time_entry rows.
alter table public.time_entry
  add column if not exists journal_data jsonb;

comment on column public.time_entry.journal_data is
  'Money Journal payload (set from Playbook → Journal). Null for normal entries.';
