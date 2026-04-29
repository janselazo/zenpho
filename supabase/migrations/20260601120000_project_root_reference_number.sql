-- Sequential product reference for CRM (PRJ-001, PRJ-002, …). Root rows only (`parent_project_id` null).

alter table public.project
  add column if not exists reference_number integer;

create unique index if not exists project_root_reference_number_key
  on public.project (reference_number)
  where parent_project_id is null and reference_number is not null;

with numbered as (
  select
    id,
    row_number() over (order by created_at asc, id asc) as n
  from public.project
  where parent_project_id is null
)
update public.project p
set reference_number = numbered.n
from numbered
where p.id = numbered.id;

create sequence if not exists public.project_root_reference_seq;

select setval(
  'public.project_root_reference_seq',
  coalesce(
    (
      select max(reference_number)
      from public.project
      where parent_project_id is null
    ),
    0
  ),
  true
);

create or replace function public.assign_project_root_reference()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.parent_project_id is null and new.reference_number is null then
    new.reference_number := nextval('public.project_root_reference_seq');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_project_root_reference on public.project;
create trigger trg_assign_project_root_reference
  before insert on public.project
  for each row
  execute function public.assign_project_root_reference();
