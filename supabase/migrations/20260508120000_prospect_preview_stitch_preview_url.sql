-- When set, /preview/{slug} redirects here so visitors see the live Stitch canvas (not export HTML).
alter table public.prospect_preview
  add column if not exists stitch_preview_url text;

comment on column public.prospect_preview.stitch_preview_url is
  'Optional https URL to Google Stitch screen preview; public GET prefers 302 to this over served html.';
