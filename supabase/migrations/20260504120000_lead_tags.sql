-- Lead tags: catalog + assignments (many-to-many with lead)

create table public.lead_tag (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#2563eb',
  created_at timestamptz not null default now()
);

create unique index lead_tag_name_lower_idx
  on public.lead_tag (lower(trim(name)));

create table public.lead_tag_assignment (
  lead_id uuid not null references public.lead (id) on delete cascade,
  tag_id uuid not null references public.lead_tag (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lead_id, tag_id)
);

create index lead_tag_assignment_tag_id_idx
  on public.lead_tag_assignment (tag_id);

alter table public.lead_tag enable row level security;
alter table public.lead_tag_assignment enable row level security;

create policy "agency_all_lead_tag"
  on public.lead_tag for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

create policy "agency_all_lead_tag_assignment"
  on public.lead_tag_assignment for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());
