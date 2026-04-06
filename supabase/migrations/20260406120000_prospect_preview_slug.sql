-- Pretty public URLs: /preview/{slug} or https://preview.example.com/{slug}
alter table public.prospect_preview
  add column if not exists slug text;

create unique index if not exists prospect_preview_slug_unique
  on public.prospect_preview (slug)
  where slug is not null and length(trim(slug)) > 0;
