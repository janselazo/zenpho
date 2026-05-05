-- Optional Google listing snapshot used for Proposal Generation enrichment (photos, categories, website).

alter table public.sales_proposal
  add column if not exists google_place_snapshot jsonb;
