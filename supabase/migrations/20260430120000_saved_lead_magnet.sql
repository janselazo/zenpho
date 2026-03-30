-- Saved lead magnet ideas (Discover bookmark + manual add). Per-user, agency staff only.

create table if not exists public.saved_lead_magnet (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  industry_id text not null,
  niche_id text not null,
  title text not null,
  description text not null,
  format text not null,
  angle text,
  source text not null check (source in ('generated', 'manual')),
  created_at timestamptz not null default now()
);

create index if not exists saved_lead_magnet_user_created_idx
  on public.saved_lead_magnet (user_id, created_at desc);

alter table public.saved_lead_magnet enable row level security;

create policy "saved_lead_magnet_select_own"
  on public.saved_lead_magnet for select
  using (
    public.is_agency_staff()
    and auth.uid() = user_id
  );

create policy "saved_lead_magnet_insert_own"
  on public.saved_lead_magnet for insert
  with check (
    public.is_agency_staff()
    and auth.uid() = user_id
  );

create policy "saved_lead_magnet_update_own"
  on public.saved_lead_magnet for update
  using (
    public.is_agency_staff()
    and auth.uid() = user_id
  )
  with check (
    public.is_agency_staff()
    and auth.uid() = user_id
  );

create policy "saved_lead_magnet_delete_own"
  on public.saved_lead_magnet for delete
  using (
    public.is_agency_staff()
    and auth.uid() = user_id
  );

grant select, insert, update, delete on public.saved_lead_magnet to authenticated;
