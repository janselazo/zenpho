-- Root product Kanban: five plan stages (Backlog → Release).
-- Migrates legacy pipeline / mvp / growth slugs.

alter table public.project drop constraint if exists project_plan_stage_check;

update public.project
set plan_stage = case plan_stage
  when 'pipeline' then 'backlog'
  when 'planning' then 'planning'
  when 'mvp' then 'building'
  when 'growth' then 'release'
  else 'backlog'
end;

alter table public.project
  alter column plan_stage set default 'backlog';

alter table public.project
  add constraint project_plan_stage_check check (
    plan_stage in (
      'backlog',
      'planning',
      'building',
      'testing',
      'release'
    )
  );
