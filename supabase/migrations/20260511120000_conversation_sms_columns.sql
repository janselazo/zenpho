-- SMS columns for the unified inbox (Twilio integration).
-- Existing RLS policies (agency_all_*) cover new columns automatically.

alter table public.conversation
  add column if not exists contact_phone text;

alter table public.conversation_message
  add column if not exists sms_sid text;

create index if not exists conversation_contact_phone_idx
  on public.conversation (contact_phone)
  where contact_phone is not null;
