-- Add doc_type column to distinguish docs from industries (and future categories).

alter table public.agency_custom_doc
  add column doc_type text not null default 'doc';

create index agency_custom_doc_doc_type_idx
  on public.agency_custom_doc (doc_type);

alter table public.agency_doc_hub_card
  add column doc_type text not null default 'doc';

create index agency_doc_hub_card_doc_type_idx
  on public.agency_doc_hub_card (doc_type);
