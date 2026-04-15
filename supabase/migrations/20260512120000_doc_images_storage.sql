-- Public bucket for agency doc images (path: docs/{slug}/{uuid}.{ext})
insert into storage.buckets (id, name, public)
  values ('doc-images', 'doc-images', true)
  on conflict (id) do nothing;

create policy "doc_images_public_read"
  on storage.objects for select
  using (bucket_id = 'doc-images');

create policy "doc_images_insert_staff"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'doc-images'
    and public.is_agency_staff()
  );

create policy "doc_images_update_staff"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'doc-images'
    and public.is_agency_staff()
  );

create policy "doc_images_delete_staff"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'doc-images'
    and public.is_agency_staff()
  );
