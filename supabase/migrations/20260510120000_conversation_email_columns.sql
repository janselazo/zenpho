-- Email threading columns for the unified inbox.
-- Existing RLS policies (agency_all_*) cover new columns automatically.

alter table public.conversation
  add column if not exists contact_email text;

alter table public.conversation_message
  add column if not exists email_message_id text,
  add column if not exists email_subject text,
  add column if not exists email_in_reply_to text;

create index if not exists conversation_contact_email_idx
  on public.conversation (contact_email)
  where contact_email is not null;

create index if not exists conversation_message_email_mid_idx
  on public.conversation_message (email_message_id)
  where email_message_id is not null;

-- Backfill demo email thread with a contact_email
update public.conversation
  set contact_email = 'wei.chen@example.com'
  where id = 'a0000000-0000-4000-8000-000000000002';
