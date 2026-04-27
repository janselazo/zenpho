-- Public bucket for conversation message attachments.
-- Path layout: conversations/{conversation_id}/{timestamp}-{rand}.{ext}
-- Used by the conversation composer (Attach + Voice buttons) so attached
-- files and recorded voice notes can be hosted on a public URL that we
-- store in conversation_message.attachment.url and forward to SendGrid /
-- Twilio MMS.

insert into storage.buckets (id, name, public)
  values ('conversation-attachments', 'conversation-attachments', true)
  on conflict (id) do nothing;

create policy "conversation_attachments_public_read"
  on storage.objects for select
  using (bucket_id = 'conversation-attachments');

create policy "conversation_attachments_insert_staff"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'conversation-attachments'
    and public.is_agency_staff()
  );

create policy "conversation_attachments_update_staff"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'conversation-attachments'
    and public.is_agency_staff()
  );

create policy "conversation_attachments_delete_staff"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'conversation-attachments'
    and public.is_agency_staff()
  );
