-- Optional contact category for lead segmentation (founder / owner personas)
alter table public.lead
  add column if not exists contact_category text;
