-- Proposal Generation wizard fields on narrative sales proposals.

alter table public.sales_proposal drop constraint if exists sales_proposal_status_check;

alter table public.sales_proposal add constraint sales_proposal_status_check
  check (status in ('draft', 'generated', 'final', 'sent'));

alter table public.sales_proposal
  add column if not exists proposal_body text not null default '',
  add column if not exists selected_catalog_item_ids jsonb not null default '[]'::jsonb,
  add column if not exists wizard_notes text not null default '',
  add column if not exists total_price_estimate numeric(12, 2);
