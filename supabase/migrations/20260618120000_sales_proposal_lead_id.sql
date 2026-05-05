-- Narrative proposals can target an open CRM lead without requiring client_id.

alter table public.sales_proposal
  add column if not exists lead_id uuid references public.lead (id) on delete set null;

create index if not exists sales_proposal_lead_id_idx on public.sales_proposal (lead_id);
