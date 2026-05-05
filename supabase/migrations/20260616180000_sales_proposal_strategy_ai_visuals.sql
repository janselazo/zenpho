-- Proposal generation: optional layered strategy JSON + AI image asset paths.

alter table public.sales_proposal
  add column if not exists proposal_strategy jsonb,
  add column if not exists proposal_ai_visuals jsonb not null default '[]'::jsonb;
