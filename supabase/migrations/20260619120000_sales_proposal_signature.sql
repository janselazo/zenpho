-- Agency signature asset for flattened PDF stamp (MVP; no recipient e-sign).

alter table public.sales_proposal
  add column if not exists signature_image_path text,
  add column if not exists signature_signer_name text,
  add column if not exists signature_signed_at timestamptz;

comment on column public.sales_proposal.signature_image_path is
  'Storage path under prospect-attachments (e.g. proposal-signatures/{id}/file.png).';
comment on column public.sales_proposal.signature_signer_name is
  'Printed name on the PDF signature block.';
comment on column public.sales_proposal.signature_signed_at is
  'When the signer name was confirmed for a signed asset (best-effort).';
