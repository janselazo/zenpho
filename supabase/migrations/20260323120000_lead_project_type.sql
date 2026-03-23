-- Optional project type for leads (matches CRM "New Lead" form)
alter table public.lead
  add column if not exists project_type text;
