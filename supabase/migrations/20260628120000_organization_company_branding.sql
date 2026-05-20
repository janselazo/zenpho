-- Company profile fields for Settings → Company and CRM sidebar branding.

alter table public.organization
  add column if not exists company_name text,
  add column if not exists company_email text,
  add column if not exists company_category text,
  add column if not exists company_phone text,
  add column if not exists company_address text,
  add column if not exists logo_url text;

grant update on public.organization to authenticated;

drop policy if exists "organization_update_member" on public.organization;
create policy "organization_update_member"
  on public.organization
  for update
  to authenticated
  using (
    id = public.current_organization_id()
    and public.is_agency_staff()
  )
  with check (
    id = public.current_organization_id()
    and public.is_agency_staff()
  );

-- Public bucket for org logos (path: {organization_id}/logo.{ext})
insert into storage.buckets (id, name, public)
  values ('company-logos', 'company-logos', true)
  on conflict (id) do nothing;

drop policy if exists "company_logos_public_read" on storage.objects;
create policy "company_logos_public_read"
  on storage.objects for select
  using (bucket_id = 'company-logos');

drop policy if exists "company_logos_insert_org" on storage.objects;
create policy "company_logos_insert_org"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'company-logos'
    and public.is_agency_staff()
    and (storage.foldername(name))[1] = public.current_organization_id()::text
  );

drop policy if exists "company_logos_update_org" on storage.objects;
create policy "company_logos_update_org"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'company-logos'
    and public.is_agency_staff()
    and (storage.foldername(name))[1] = public.current_organization_id()::text
  );

drop policy if exists "company_logos_delete_org" on storage.objects;
create policy "company_logos_delete_org"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'company-logos'
    and public.is_agency_staff()
    and (storage.foldername(name))[1] = public.current_organization_id()::text
  );
