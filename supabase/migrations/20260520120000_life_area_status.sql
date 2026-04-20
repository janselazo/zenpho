-- My Life: personal traffic-light status (red/yellow/green) + note per life area.
-- One row per (user, area). Unseeded areas default to yellow at read time in the app.

create table public.life_area_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  area text not null check (
    area in ('health', 'work', 'finances', 'family', 'hobbies', 'community', 'spiritual')
  ),
  status text not null default 'yellow' check (status in ('red', 'yellow', 'green')),
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, area)
);

create index life_area_status_user_id_idx
  on public.life_area_status (user_id);

alter table public.life_area_status enable row level security;

create policy "agency_all_life_area_status"
  on public.life_area_status for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

-- Keep updated_at current on every row mutation.
create or replace function public.touch_life_area_status_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_touch_life_area_status_updated_at
  before update on public.life_area_status
  for each row execute function public.touch_life_area_status_updated_at();

grant select, insert, update, delete on public.life_area_status to authenticated;
