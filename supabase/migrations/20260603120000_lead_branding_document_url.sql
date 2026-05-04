-- Optional external URL for a branding PDF / deck (distinct from generated prospect-attachments path).

alter table public.lead
  add column if not exists branding_document_url text;

comment on column public.lead.branding_document_url is
  'External link to a branding document (Drive, Dropbox, etc.). Separate from branding_funnel_pdf_path in storage.';
