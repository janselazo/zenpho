-- Link issues to workspace (localStorage) tasks without FK to public.task.
alter table public.issue
  add column if not exists workspace_task_id text;

comment on column public.issue.workspace_task_id is
  'Client-generated task id from CRM workspace JSON when issue is converted to a task.';
