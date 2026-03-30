-- Products (root project rows) vs phase projects (child rows), task milestones, issues.

-- 1) Self-FK: null parent = product; non-null = phase under that product
alter table public.project
  add column if not exists parent_project_id uuid references public.project (id) on delete cascade;

create index if not exists project_parent_project_id_idx
  on public.project (parent_project_id)
  where parent_project_id is not null;

create index if not exists project_root_by_client_idx
  on public.project (client_id, created_at desc)
  where parent_project_id is null;

-- 2) Task milestone (ladder); default for existing rows
alter table public.task
  add column if not exists milestone_key text not null default 'unassigned';

alter table public.task drop constraint if exists task_milestone_key_check;

alter table public.task
  add constraint task_milestone_key_check check (
    milestone_key in (
      'unassigned',
      'discovery',
      'wireframing',
      'design',
      'development',
      'testing',
      'deployment',
      'feedback'
    )
  );

create index if not exists task_project_milestone_idx
  on public.task (project_id, milestone_key);

-- 3) Issues (per phase project)
create table if not exists public.issue (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'open',
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  related_task_id uuid references public.task (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists issue_project_id_created_idx
  on public.issue (project_id, created_at desc);

alter table public.issue enable row level security;

drop policy if exists "agency_all_issue" on public.issue;
create policy "agency_all_issue"
  on public.issue for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

drop policy if exists "client_select_issue" on public.issue;
create policy "client_select_issue"
  on public.issue for select
  using (
    exists (
      select 1
      from public.project pr
      join public.profiles p on p.client_id = pr.client_id
      where pr.id = issue.project_id
        and p.id = auth.uid()
        and p.role = 'client'
    )
  );

grant select, insert, update, delete on public.issue to authenticated;

-- 4) Backfill: every root row without children becomes product + legacy row becomes "Main" phase
do $$
declare
  rec record;
  new_pid uuid;
begin
  for rec in
    select p.*
    from public.project p
    where p.parent_project_id is null
      and not exists (
        select 1 from public.project c where c.parent_project_id = p.id
      )
  loop
    new_pid := gen_random_uuid();
    insert into public.project (
      id,
      client_id,
      title,
      description,
      status,
      assigned_to,
      start_date,
      target_date,
      created_at,
      website,
      budget,
      plan_stage,
      project_type,
      metadata,
      parent_project_id
    )
    values (
      new_pid,
      rec.client_id,
      rec.title,
      rec.description,
      rec.status,
      rec.assigned_to,
      rec.start_date,
      rec.target_date,
      rec.created_at,
      rec.website,
      rec.budget,
      rec.plan_stage,
      rec.project_type,
      coalesce(rec.metadata, '{}'::jsonb),
      null
    );
    update public.project
    set
      parent_project_id = new_pid,
      title = 'Main',
      website = null,
      budget = null
    where id = rec.id;
  end loop;
end;
$$;
