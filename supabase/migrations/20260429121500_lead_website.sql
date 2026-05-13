-- Company / marketing site URL for proposals and context (separate from social links).
alter table public.lead
  add column if not exists website text;
