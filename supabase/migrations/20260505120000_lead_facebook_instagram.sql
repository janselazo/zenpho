-- Optional social profile URLs on leads (e.g. from prospect intel / website scan).
alter table public.lead
  add column if not exists facebook text,
  add column if not exists instagram text;
