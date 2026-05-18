-- Ensure app notifications are available to Supabase Realtime listeners.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'app_notification'
     ) then
    alter publication supabase_realtime add table public.app_notification;
  end if;
end;
$$;
