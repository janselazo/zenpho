-- Observability log for SendGrid Inbound Parse webhook calls.
-- One row per POST attempt to /api/webhooks/sendgrid/inbound, including 401 token mismatches
-- and unparseable payloads, so the agency can diagnose why a reply did or did not appear in
-- Conversations.

create table public.sendgrid_inbound_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null check (
    status in (
      'unauthorized',
      'invalid_payload',
      'threaded',
      'new_conversation',
      'error',
      'diagnostic'
    )
  ),
  from_email text,
  subject text,
  in_reply_to text,
  references_header text,
  external_message_id text,
  conversation_id uuid null references public.conversation (id) on delete set null,
  error_message text,
  headers_snippet text
);

create index sendgrid_inbound_log_created_at_idx
  on public.sendgrid_inbound_log (created_at desc);

comment on table public.sendgrid_inbound_log is
  'Audit log of SendGrid Inbound Parse webhook calls. One row per POST. Service role inserts; agency staff read.';

alter table public.sendgrid_inbound_log enable row level security;

create policy "agency_staff_sendgrid_inbound_log_select"
  on public.sendgrid_inbound_log for select
  using (public.is_agency_staff());
