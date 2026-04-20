-- My Life: individual tasks per life area, each with its own traffic-light status.
-- Powers the project-manager-style layout (sections = life areas, rows = tasks).

create table public.life_task (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  area text not null check (
    area in ('health', 'work', 'finances', 'family', 'hobbies', 'community', 'spiritual')
  ),
  title text not null,
  status text not null default 'yellow' check (status in ('red', 'yellow', 'green')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index life_task_user_area_idx
  on public.life_task (user_id, area, sort_order, created_at);

alter table public.life_task enable row level security;

create policy "agency_all_life_task"
  on public.life_task for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

create or replace function public.touch_life_task_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_touch_life_task_updated_at
  before update on public.life_task
  for each row execute function public.touch_life_task_updated_at();

grant select, insert, update, delete on public.life_task to authenticated;
