-- Allow multiple deals per lead (handshake / Create deal can add another row).
alter table public.deal drop constraint if exists deal_lead_id_key;
