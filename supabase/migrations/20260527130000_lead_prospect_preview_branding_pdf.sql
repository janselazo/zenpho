-- Link CRM leads to hosted prospect previews and persist Brand Kit + Sales Funnel PDFs.

insert into storage.buckets (id, name, public)
  values ('prospect-attachments', 'prospect-attachments', true)
  on conflict (id) do nothing;

do $policies$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'prospect_attachments_public_read'
  ) then
    create policy "prospect_attachments_public_read"
      on storage.objects for select
      using (bucket_id = 'prospect-attachments');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'prospect_attachments_insert_staff'
  ) then
    create policy "prospect_attachments_insert_staff"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'prospect-attachments'
        and public.is_agency_staff()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'prospect_attachments_update_staff'
  ) then
    create policy "prospect_attachments_update_staff"
      on storage.objects for update to authenticated
      using (
        bucket_id = 'prospect-attachments'
        and public.is_agency_staff()
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'prospect_attachments_delete_staff'
  ) then
    create policy "prospect_attachments_delete_staff"
      on storage.objects for delete to authenticated
      using (
        bucket_id = 'prospect-attachments'
        and public.is_agency_staff()
      );
  end if;
end
$policies$;

alter table public.prospect_preview
  add column if not exists preview_target text;

do $ct$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'prospect_preview_preview_target_check'
  ) then
    alter table public.prospect_preview
      add constraint prospect_preview_preview_target_check
      check (
        preview_target is null
        or preview_target in ('website', 'webapp', 'mobile')
      );
  end if;
end
$ct$;

comment on column public.prospect_preview.preview_target is
  'Generator target: marketing website, web app shell, or mobile — set when the row is created.';

alter table public.lead
  add column if not exists prospect_preview_id uuid references public.prospect_preview (id) on delete set null;

alter table public.lead
  add column if not exists branding_funnel_pdf_path text;

alter table public.lead
  add column if not exists branding_funnel_pdf_created_at timestamptz;

create index if not exists lead_prospect_preview_id_idx
  on public.lead (prospect_preview_id)
  where prospect_preview_id is not null;

comment on column public.lead.prospect_preview_id is
  'Hosted prospect preview (Stitch / LLM) shown on the lead record.';
comment on column public.lead.branding_funnel_pdf_path is
  'Object path in the prospect-attachments bucket for the Brand Kit + Sales Funnel PDF.';
comment on column public.lead.branding_funnel_pdf_created_at is
  'When the branding funnel PDF was stored for this lead.';
