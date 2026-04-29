-- Product Manager module: discovery, roadmap, work items, sprints, releases,
-- extended resources, workflow status overrides, and QA/issue fields.

-- ── Discovery (scoped to root product) ─────────────────────────────────────
create table if not exists public.project_discovery_section (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.project (id) on delete cascade,
  section_key text not null,
  title text not null default '',
  body text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_discovery_section_product_idx
  on public.project_discovery_section (product_id, sort_order);

-- ── Roadmap phases (scoped to root product; high-level client-ready plan) ──
create table if not exists public.project_roadmap_phase (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.project (id) on delete cascade,
  phase_slug text not null,
  title text not null,
  description text,
  sort_order int not null default 0,
  status text not null default 'planned',
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_roadmap_phase_product_idx
  on public.project_roadmap_phase (product_id, sort_order);

-- ── Sprints (delivery child project) ───────────────────────────────────────
create table if not exists public.project_sprint (
  id uuid primary key default gen_random_uuid(),
  child_project_id uuid not null references public.project (id) on delete cascade,
  name text not null,
  milestone_label text,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_sprint_child_idx
  on public.project_sprint (child_project_id, sort_order);

-- ── Releases / milestones (delivery child) ─────────────────────────────────
create table if not exists public.project_release (
  id uuid primary key default gen_random_uuid(),
  child_project_id uuid not null references public.project (id) on delete cascade,
  title text not null,
  target_date date,
  owner_member_id text,
  approval_status text not null default 'pending',
  completion_pct int not null default 0 check (completion_pct >= 0 and completion_pct <= 100),
  dependencies text,
  notes text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_release_child_idx
  on public.project_release (child_project_id, sort_order);

-- ── Work items (backlog + sprint board; replaces localStorage long-term) ───
create table if not exists public.project_work_item (
  id uuid primary key default gen_random_uuid(),
  child_project_id uuid not null references public.project (id) on delete cascade,
  sprint_id uuid references public.project_sprint (id) on delete set null,
  release_id uuid references public.project_release (id) on delete set null,
  title text not null,
  description text,
  item_type text not null default 'task' check (
    item_type in (
      'feature',
      'user_story',
      'task',
      'bug',
      'improvement',
      'client_request'
    )
  ),
  priority text check (priority in ('low', 'medium', 'high', 'urgent')),
  estimate_hours numeric(10, 2),
  assignee_member_id text,
  board_status text not null default 'ready' check (
    board_status in (
      'ready',
      'in_progress',
      'code_review',
      'qa',
      'client_review',
      'done',
      'blocked'
    )
  ),
  acceptance_criteria text,
  scope_label text check (
    scope_label is null
    or scope_label in ('in_scope', 'out_of_scope', 'post_mvp', 'change_request')
  ),
  product_milestone_uuid uuid,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_work_item_child_idx
  on public.project_work_item (child_project_id, sprint_id, board_status);

-- ── Extended resources (product-level structured resources) ───────────────
create table if not exists public.project_manager_resource (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.project (id) on delete cascade,
  category text not null check (
    category in (
      'team',
      'roles',
      'capacity',
      'files',
      'links',
      'credentials',
      'tech_stack',
      'environments',
      'brand',
      'meetings'
    )
  ),
  label text not null,
  body text,
  url text,
  is_secret boolean not null default false,
  secret_placeholder text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_manager_resource_product_idx
  on public.project_manager_resource (product_id, category, sort_order);

-- ── Per-child workflow column overrides (optional future use) ───────────────
create table if not exists public.project_workflow_status (
  id uuid primary key default gen_random_uuid(),
  child_project_id uuid not null references public.project (id) on delete cascade,
  domain text not null check (domain in ('task_board', 'bug')),
  slug text not null,
  label text not null,
  color text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (child_project_id, domain, slug)
);

create index if not exists project_workflow_status_child_idx
  on public.project_workflow_status (child_project_id, domain, sort_order);

-- ── Issue / QA extensions ───────────────────────────────────────────────────
alter table public.issue
  add column if not exists environment text,
  add column if not exists browser_device text,
  add column if not exists steps_to_reproduce text,
  add column if not exists expected_result text,
  add column if not exists actual_result text,
  add column if not exists attachment_urls jsonb not null default '[]'::jsonb;

-- Widen bug lifecycle statuses (normalize legacy values)
alter table public.issue drop constraint if exists issue_status_check;

update public.issue
set status = 'new'
where lower(trim(status)) in ('open');

update public.issue
set status = 'fixed'
where lower(trim(status)) in ('resolved', 'closed');

update public.issue
set status = 'new'
where status is null
   or lower(trim(status)) not in (
     'new',
     'confirmed',
     'in_progress',
     'ready_for_qa',
     'fixed',
     'rejected',
     'reopened'
   );

alter table public.issue
  add constraint issue_status_check check (
    status in (
      'new',
      'confirmed',
      'in_progress',
      'ready_for_qa',
      'fixed',
      'rejected',
      'reopened'
    )
  );

-- ── RLS (agency staff full access; clients unchanged on issue) ──────────────
alter table public.project_discovery_section enable row level security;
alter table public.project_roadmap_phase enable row level security;
alter table public.project_sprint enable row level security;
alter table public.project_release enable row level security;
alter table public.project_work_item enable row level security;
alter table public.project_manager_resource enable row level security;
alter table public.project_workflow_status enable row level security;

drop policy if exists "agency_all_project_discovery_section" on public.project_discovery_section;
create policy "agency_all_project_discovery_section"
  on public.project_discovery_section for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

drop policy if exists "agency_all_project_roadmap_phase" on public.project_roadmap_phase;
create policy "agency_all_project_roadmap_phase"
  on public.project_roadmap_phase for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

drop policy if exists "agency_all_project_sprint" on public.project_sprint;
create policy "agency_all_project_sprint"
  on public.project_sprint for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

drop policy if exists "agency_all_project_release" on public.project_release;
create policy "agency_all_project_release"
  on public.project_release for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

drop policy if exists "agency_all_project_work_item" on public.project_work_item;
create policy "agency_all_project_work_item"
  on public.project_work_item for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

drop policy if exists "agency_all_project_manager_resource" on public.project_manager_resource;
create policy "agency_all_project_manager_resource"
  on public.project_manager_resource for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

drop policy if exists "agency_all_project_workflow_status" on public.project_workflow_status;
create policy "agency_all_project_workflow_status"
  on public.project_workflow_status for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

grant select, insert, update, delete on public.project_discovery_section to authenticated;
grant select, insert, update, delete on public.project_roadmap_phase to authenticated;
grant select, insert, update, delete on public.project_sprint to authenticated;
grant select, insert, update, delete on public.project_release to authenticated;
grant select, insert, update, delete on public.project_work_item to authenticated;
grant select, insert, update, delete on public.project_manager_resource to authenticated;
grant select, insert, update, delete on public.project_workflow_status to authenticated;
