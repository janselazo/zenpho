-- Backfill prospect_preview.slug for rows saved before atomic insert+slug.
-- Matches prospectPreviewSlugFromBusiness (NFD + strip combining marks, alnum → hyphens, 72 chars + '-' + first 8 hex of uuid).

do $$
declare
  r record;
  base text;
  id8 text;
  new_slug text;
begin
  for r in
    select id, coalesce(business_name, '') as business_name
    from public.prospect_preview
    where slug is null or length(trim(slug)) = 0
  loop
    base := left(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              normalize(lower(trim(r.business_name)), nfd),
              e'[\u0300-\u036f]',
              '',
              'gi'
            ),
            '[^a-z0-9]+',
            '-',
            'g'
          ),
          '^-+',
          '',
          'g'
        ),
        '-+$',
        '',
        'g'
      ),
      72
    );

    if base is null or length(trim(base)) = 0 then
      base := 'preview';
    end if;

    id8 := lower(left(replace(r.id::text, '-', ''), 8));
    new_slug := base || '-' || id8;

    if exists (
      select 1
      from public.prospect_preview
      where slug = new_slug
        and id <> r.id
    ) then
      new_slug := base || '-' || replace(r.id::text, '-', '');
    end if;

    update public.prospect_preview
    set
      slug = new_slug,
      updated_at = now()
    where id = r.id;
  end loop;
end;
$$;
