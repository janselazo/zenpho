-- Multi-tenant isolation: every agency user belongs to an organization; CRM rows are scoped by organization_id.
-- Existing data is assigned to a fixed "Zenpho Legacy" org; new signups get a fresh organization via handle_new_user.

-- ── Fixed legacy org id (existing production + singleton rows backfill) ─────
-- Must match src/lib/organization.ts LEGACY_ORGANIZATION_ID.

create table if not exists public.organization (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

insert into public.organization (id, name)
values ('00000000-0000-0000-0000-000000000001'::uuid, 'Zenpho Legacy')
on conflict (id) do nothing;

-- Current user's organization (session-scoped; avoids RLS recursion on profiles)
create or replace function public.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.organization_id
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke all on function public.current_organization_id() from public;
grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.current_organization_id() to service_role;

-- ── profiles.organization_id ────────────────────────────────────────────────
alter table public.profiles
  add column if not exists organization_id uuid references public.organization (id) on delete restrict;

update public.profiles
set organization_id = '00000000-0000-0000-0000-000000000001'::uuid
where organization_id is null;

-- Clients: tie profile to their client row's org (after client has org_id, below)
-- Second pass runs after client backfill.

-- ── Core CRM & related tables: add column ─────────────────────────────────
alter table public.client add column if not exists organization_id uuid references public.organization (id);
alter table public.lead add column if not exists organization_id uuid references public.organization (id);
alter table public.project add column if not exists organization_id uuid references public.organization (id);
alter table public.task add column if not exists organization_id uuid references public.organization (id);
alter table public.appointment add column if not exists organization_id uuid references public.organization (id);
alter table public.transaction add column if not exists organization_id uuid references public.organization (id);
alter table public.goal add column if not exists organization_id uuid references public.organization (id);
alter table public.deal add column if not exists organization_id uuid references public.organization (id);
alter table public.conversation add column if not exists organization_id uuid references public.organization (id);
alter table public.conversation_message add column if not exists organization_id uuid references public.organization (id);

alter table public.income_source add column if not exists organization_id uuid references public.organization (id);
alter table public.income_entry add column if not exists organization_id uuid references public.organization (id);
alter table public.fixed_expense add column if not exists organization_id uuid references public.organization (id);
alter table public.variable_expense_entry add column if not exists organization_id uuid references public.organization (id);

alter table public.proposal add column if not exists organization_id uuid references public.organization (id);
alter table public.proposal_line_item add column if not exists organization_id uuid references public.organization (id);
alter table public.contract add column if not exists organization_id uuid references public.organization (id);

alter table public.prospect_preview add column if not exists organization_id uuid references public.organization (id);
alter table public.prospect_intel_report add column if not exists organization_id uuid references public.organization (id);

alter table public.life_task add column if not exists organization_id uuid references public.organization (id);
alter table public.life_area_status add column if not exists organization_id uuid references public.organization (id);

alter table public.issue add column if not exists organization_id uuid references public.organization (id);

alter table public.lead_tag add column if not exists organization_id uuid references public.organization (id);
alter table public.lead_tag_assignment add column if not exists organization_id uuid references public.organization (id);

alter table public.prospect_signal_hit add column if not exists organization_id uuid references public.organization (id);
alter table public.prospect_signal_monitor_run add column if not exists organization_id uuid references public.organization (id);

alter table public.project_discovery_section add column if not exists organization_id uuid references public.organization (id);
alter table public.project_roadmap_phase add column if not exists organization_id uuid references public.organization (id);
alter table public.project_sprint add column if not exists organization_id uuid references public.organization (id);
alter table public.project_release add column if not exists organization_id uuid references public.organization (id);
alter table public.project_work_item add column if not exists organization_id uuid references public.organization (id);
alter table public.project_manager_resource add column if not exists organization_id uuid references public.organization (id);
alter table public.project_workflow_status add column if not exists organization_id uuid references public.organization (id);

alter table public.crm_product_service add column if not exists organization_id uuid references public.organization (id);
alter table public.sales_proposal add column if not exists organization_id uuid references public.organization (id);
alter table public.sales_proposal_catalog_line add column if not exists organization_id uuid references public.organization (id);

alter table public.agency_custom_doc add column if not exists organization_id uuid references public.organization (id);
alter table public.sendgrid_inbound_log add column if not exists organization_id uuid references public.organization (id);

-- Docs with slug PK: add org column first
alter table public.agency_workspace_doc add column if not exists organization_id uuid references public.organization (id);
alter table public.agency_doc_hub_card add column if not exists organization_id uuid references public.organization (id);

-- Singleton integrations + crm_settings: add org column; re-PK later
alter table public.crm_settings add column if not exists organization_id uuid references public.organization (id);
alter table public.agency_sendgrid_integration add column if not exists organization_id uuid references public.organization (id);
alter table public.agency_twilio_integration add column if not exists organization_id uuid references public.organization (id);

-- ── Backfill: everything to legacy org ────────────────────────────────────
update public.client set organization_id = '00000000-0000-0000-0000-000000000001'::uuid where organization_id is null;
update public.lead set organization_id = '00000000-0000-0000-0000-000000000001'::uuid where organization_id is null;
update public.project set organization_id = '00000000-0000-0000-0000-000000000001'::uuid where organization_id is null;

update public.task t
set organization_id = p.organization_id
from public.project p
where t.project_id = p.id and t.organization_id is null;

update public.appointment a
set organization_id = coalesce(
  (select l.organization_id from public.lead l where l.id = a.lead_id),
  (select c.organization_id from public.client c where c.id = a.client_id),
  (select p.organization_id from public.project p where p.id = a.project_id),
  '00000000-0000-0000-0000-000000000001'::uuid
)
where a.organization_id is null;

update public.transaction set organization_id = '00000000-0000-0000-0000-000000000001'::uuid where organization_id is null;
update public.goal set organization_id = '00000000-0000-0000-0000-000000000001'::uuid where organization_id is null;

update public.deal d
set organization_id = coalesce(
  (select l.organization_id from public.lead l where l.id = d.lead_id),
  '00000000-0000-0000-0000-000000000001'::uuid
)
where d.organization_id is null;

update public.conversation c
set organization_id = coalesce(
  (select l.organization_id from public.lead l where l.id = c.lead_id),
  (select cl.organization_id from public.client cl where cl.id = c.client_id),
  '00000000-0000-0000-0000-000000000001'::uuid
)
where c.organization_id is null;

update public.conversation_message m
set organization_id = c.organization_id
from public.conversation c
where c.id = m.conversation_id and m.organization_id is null;

update public.income_source set organization_id = '00000000-0000-0000-0000-000000000001'::uuid where organization_id is null;

update public.income_entry e
set organization_id = s.organization_id
from public.income_source s
where s.id = e.income_source_id and e.organization_id is null;

update public.fixed_expense set organization_id = '00000000-0000-0000-0000-000000000001'::uuid where organization_id is null;
update public.variable_expense_entry set organization_id = '00000000-0000-0000-0000-000000000001'::uuid where organization_id is null;

update public.proposal set organization_id = '00000000-0000-0000-0000-000000000001'::uuid where organization_id is null;

update public.proposal_line_item li
set organization_id = p.organization_id
from public.proposal p
where p.id = li.proposal_id and li.organization_id is null;

update public.contract set organization_id = '00000000-0000-0000-0000-000000000001'::uuid where organization_id is null;

update public.prospect_preview set organization_id = '00000000-0000-0000-0000-000000000001'::uuid where organization_id is null;

update public.prospect_intel_report set organization_id = '00000000-0000-0000-0000-000000000001'::uuid where organization_id is null;

update public.life_task set organization_id = '00000000-0000-0000-0000-000000000001'::uuid where organization_id is null;
update public.life_area_status set organization_id = '00000000-0000-0000-0000-000000000001'::uuid where organization_id is null;

update public.issue i
set organization_id = p.organization_id
from public.project p
where p.id = i.project_id and i.organization_id is null;

update public.lead_tag set organization_id = '00000000-0000-0000-0000-000000000001'::uuid where organization_id is null;

update public.lead_tag_assignment a
set organization_id = l.organization_id
from public.lead l
where l.id = a.lead_id and a.organization_id is null;

update public.prospect_signal_hit h
set organization_id = coalesce(
  (select l.organization_id from public.lead l where l.id = h.lead_id),
  '00000000-0000-0000-0000-000000000001'::uuid
)
where h.organization_id is null;

update public.prospect_signal_monitor_run set organization_id = '00000000-0000-0000-0000-000000000001'::uuid where organization_id is null;

update public.project_discovery_section s
set organization_id = p.organization_id
from public.project p
where p.id = s.product_id and s.organization_id is null;

update public.project_roadmap_phase s
set organization_id = p.organization_id
from public.project p
where p.id = s.product_id and s.organization_id is null;

update public.project_sprint s
set organization_id = p.organization_id
from public.project p
where p.id = s.child_project_id and s.organization_id is null;

update public.project_release s
set organization_id = p.organization_id
from public.project p
where p.id = s.child_project_id and s.organization_id is null;

update public.project_work_item s
set organization_id = p.organization_id
from public.project p
where p.id = s.child_project_id and s.organization_id is null;

update public.project_manager_resource s
set organization_id = p.organization_id
from public.project p
where p.id = s.product_id and s.organization_id is null;

update public.project_workflow_status s
set organization_id = p.organization_id
from public.project p
where p.id = s.child_project_id and s.organization_id is null;

update public.crm_product_service set organization_id = '00000000-0000-0000-0000-000000000001'::uuid where organization_id is null;

update public.sales_proposal sp
set organization_id = coalesce(
  (select c.organization_id from public.client c where c.id = sp.client_id),
  '00000000-0000-0000-0000-000000000001'::uuid
)
where sp.organization_id is null;

update public.sales_proposal_catalog_line cl
set organization_id = sp.organization_id
from public.sales_proposal sp
where sp.id = cl.sales_proposal_id and cl.organization_id is null;

update public.agency_custom_doc set organization_id = '00000000-0000-0000-0000-000000000001'::uuid where organization_id is null;

update public.sendgrid_inbound_log l
set organization_id = coalesce(
  (select c.organization_id from public.conversation c where c.id = l.conversation_id),
  '00000000-0000-0000-0000-000000000001'::uuid
)
where l.organization_id is null;

update public.agency_workspace_doc set organization_id = '00000000-0000-0000-0000-000000000001'::uuid where organization_id is null;
update public.agency_doc_hub_card set organization_id = '00000000-0000-0000-0000-000000000001'::uuid where organization_id is null;

update public.crm_settings set organization_id = '00000000-0000-0000-0000-000000000001'::uuid where organization_id is null;
update public.agency_sendgrid_integration set organization_id = '00000000-0000-0000-0000-000000000001'::uuid where organization_id is null;
update public.agency_twilio_integration set organization_id = '00000000-0000-0000-0000-000000000001'::uuid where organization_id is null;

-- Client-role profiles: follow their client row's org
update public.profiles pr
set organization_id = c.organization_id
from public.client c
where pr.role = 'client'
  and pr.client_id = c.id
  and c.organization_id is not null;

-- ── PK / uniqueness changes (slug + singleton) ──────────────────────────
alter table public.crm_settings drop constraint if exists crm_settings_pkey;
alter table public.crm_settings drop constraint if exists crm_settings_singleton;
alter table public.crm_settings drop column if exists id;
alter table public.crm_settings alter column organization_id set not null;
alter table public.crm_settings add primary key (organization_id);

alter table public.agency_sendgrid_integration drop constraint if exists agency_sendgrid_integration_pkey;
alter table public.agency_sendgrid_integration drop column if exists id;
alter table public.agency_sendgrid_integration alter column organization_id set not null;
alter table public.agency_sendgrid_integration add primary key (organization_id);

alter table public.agency_twilio_integration drop constraint if exists agency_twilio_integration_pkey;
alter table public.agency_twilio_integration drop column if exists id;
alter table public.agency_twilio_integration alter column organization_id set not null;
alter table public.agency_twilio_integration add primary key (organization_id);

-- workspace docs / hub: composite PK
alter table public.agency_workspace_doc drop constraint if exists agency_workspace_doc_pkey;
alter table public.agency_workspace_doc alter column organization_id set not null;
alter table public.agency_workspace_doc add primary key (organization_id, slug);

alter table public.agency_doc_hub_card drop constraint if exists agency_doc_hub_card_pkey;
alter table public.agency_doc_hub_card alter column organization_id set not null;
alter table public.agency_doc_hub_card add primary key (organization_id, slug);

alter table public.agency_custom_doc drop constraint if exists agency_custom_doc_slug_key;
create unique index if not exists agency_custom_doc_org_slug_key
  on public.agency_custom_doc (organization_id, slug);

-- ── NOT NULL on tenant columns (excluding appointment edge cases handled) ─
alter table public.client alter column organization_id set not null;
alter table public.lead alter column organization_id set not null;
alter table public.project alter column organization_id set not null;
alter table public.task alter column organization_id set not null;
alter table public.appointment alter column organization_id set not null;
alter table public.transaction alter column organization_id set not null;
alter table public.goal alter column organization_id set not null;
alter table public.deal alter column organization_id set not null;
alter table public.conversation alter column organization_id set not null;
alter table public.conversation_message alter column organization_id set not null;

alter table public.income_source alter column organization_id set not null;
alter table public.income_entry alter column organization_id set not null;
alter table public.fixed_expense alter column organization_id set not null;
alter table public.variable_expense_entry alter column organization_id set not null;

alter table public.proposal alter column organization_id set not null;
alter table public.proposal_line_item alter column organization_id set not null;
alter table public.contract alter column organization_id set not null;

alter table public.prospect_preview alter column organization_id set not null;
alter table public.prospect_intel_report alter column organization_id set not null;
alter table public.life_task alter column organization_id set not null;
alter table public.life_area_status alter column organization_id set not null;
alter table public.issue alter column organization_id set not null;
alter table public.lead_tag alter column organization_id set not null;
alter table public.lead_tag_assignment alter column organization_id set not null;
alter table public.prospect_signal_hit alter column organization_id set not null;
alter table public.prospect_signal_monitor_run alter column organization_id set not null;

alter table public.project_discovery_section alter column organization_id set not null;
alter table public.project_roadmap_phase alter column organization_id set not null;
alter table public.project_sprint alter column organization_id set not null;
alter table public.project_release alter column organization_id set not null;
alter table public.project_work_item alter column organization_id set not null;
alter table public.project_manager_resource alter column organization_id set not null;
alter table public.project_workflow_status alter column organization_id set not null;

alter table public.crm_product_service alter column organization_id set not null;
alter table public.sales_proposal alter column organization_id set not null;
alter table public.sales_proposal_catalog_line alter column organization_id set not null;
alter table public.agency_custom_doc alter column organization_id set not null;
alter table public.sendgrid_inbound_log alter column organization_id set not null;

alter table public.profiles alter column organization_id set not null;

-- Defaults for inserts via authenticated sessions
alter table public.client alter column organization_id set default public.current_organization_id();
alter table public.lead alter column organization_id set default public.current_organization_id();
alter table public.project alter column organization_id set default public.current_organization_id();
alter table public.task alter column organization_id set default public.current_organization_id();
alter table public.appointment alter column organization_id set default public.current_organization_id();
alter table public.transaction alter column organization_id set default public.current_organization_id();
alter table public.goal alter column organization_id set default public.current_organization_id();
alter table public.deal alter column organization_id set default public.current_organization_id();
alter table public.conversation alter column organization_id set default public.current_organization_id();
alter table public.conversation_message alter column organization_id set default public.current_organization_id();

alter table public.income_source alter column organization_id set default public.current_organization_id();
alter table public.income_entry alter column organization_id set default public.current_organization_id();
alter table public.fixed_expense alter column organization_id set default public.current_organization_id();
alter table public.variable_expense_entry alter column organization_id set default public.current_organization_id();

alter table public.proposal alter column organization_id set default public.current_organization_id();
alter table public.proposal_line_item alter column organization_id set default public.current_organization_id();
alter table public.contract alter column organization_id set default public.current_organization_id();

alter table public.prospect_preview alter column organization_id set default public.current_organization_id();
alter table public.prospect_intel_report alter column organization_id set default public.current_organization_id();
alter table public.life_task alter column organization_id set default public.current_organization_id();
alter table public.life_area_status alter column organization_id set default public.current_organization_id();
alter table public.issue alter column organization_id set default public.current_organization_id();
alter table public.lead_tag alter column organization_id set default public.current_organization_id();
alter table public.lead_tag_assignment alter column organization_id set default public.current_organization_id();
alter table public.prospect_signal_hit alter column organization_id set default public.current_organization_id();
alter table public.prospect_signal_monitor_run alter column organization_id set default public.current_organization_id();

alter table public.project_discovery_section alter column organization_id set default public.current_organization_id();
alter table public.project_roadmap_phase alter column organization_id set default public.current_organization_id();
alter table public.project_sprint alter column organization_id set default public.current_organization_id();
alter table public.project_release alter column organization_id set default public.current_organization_id();
alter table public.project_work_item alter column organization_id set default public.current_organization_id();
alter table public.project_manager_resource alter column organization_id set default public.current_organization_id();
alter table public.project_workflow_status alter column organization_id set default public.current_organization_id();

alter table public.crm_product_service alter column organization_id set default public.current_organization_id();
alter table public.sales_proposal alter column organization_id set default public.current_organization_id();
alter table public.sales_proposal_catalog_line alter column organization_id set default public.current_organization_id();
alter table public.agency_custom_doc alter column organization_id set default public.current_organization_id();

-- ── signup: new org per user ────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  role_val text;
  org_label text;
begin
  role_val := coalesce(
    nullif(trim(new.raw_user_meta_data->>'role'), ''),
    'agency_member'
  );

  org_label :=
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'organization_name'), ''),
      concat(split_part(new.email, '@', 1), '''s workspace')
    );

  insert into public.organization (name)
  values (left(org_label, 200))
  returning id into new_org_id;

  insert into public.profiles (id, email, full_name, role, organization_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    role_val,
    new_org_id
  );

  return new;
end;
$$;

-- ── Finance sync triggers: propagate organization_id into transaction ──────
create or replace function public.sync_income_entry_to_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  if tg_op = 'DELETE' then
    delete from public.transaction
      where category = 'income_entry'
        and description like 'ie:' || old.id::text || ':%';
    return old;
  end if;

  select e.organization_id into v_org from public.income_entry e where e.id = new.id;
  if v_org is null then
    select s.organization_id into v_org from public.income_source s where s.id = new.income_source_id;
  end if;

  delete from public.transaction
    where category = 'income_entry'
      and description like 'ie:' || new.id::text || ':%';

  if new.revenue > 0 then
    insert into public.transaction (
      organization_id,
      type, amount, category, description, date
    )
    values (
      v_org,
      'revenue', new.revenue, 'income_entry', 'ie:' || new.id::text || ':rev', new.month
    );
  end if;

  if new.expenses > 0 then
    insert into public.transaction (
      organization_id,
      type, amount, category, description, date
    )
    values (
      v_org,
      'expense', new.expenses, 'income_entry', 'ie:' || new.id::text || ':exp', new.month
    );
  end if;

  return new;
end;
$$;

create or replace function public.sync_variable_expense_to_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  if tg_op = 'DELETE' then
    delete from public.transaction
      where category = 'variable_expense'
        and description = 've:' || old.id::text;
    return old;
  end if;

  v_org := new.organization_id;

  delete from public.transaction
    where category = 'variable_expense'
      and description = 've:' || new.id::text;

  if new.amount > 0 then
    insert into public.transaction (
      organization_id,
      type, amount, category, description, date
    )
    values (
      v_org,
      'expense', new.amount, 'variable_expense', 've:' || new.id::text, new.date
    );
  end if;

  return new;
end;
$$;

-- Seed per-org singleton CRM/integration rows when an organization is created
create or replace function public.organization_seed_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.crm_settings (
    organization_id,
    lead_pipeline,
    deal_pipeline,
    crm_field_options,
    updated_at
  )
  values (
    new.id,
    '[]'::jsonb,
    '[]'::jsonb,
    '{}'::jsonb,
    now()
  )
  on conflict (organization_id) do nothing;

  insert into public.agency_sendgrid_integration (organization_id, updated_at)
  values (new.id, now())
  on conflict (organization_id) do nothing;

  insert into public.agency_twilio_integration (organization_id, updated_at)
  values (new.id, now())
  on conflict (organization_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_organization_seed_defaults on public.organization;
create trigger trg_organization_seed_defaults
  after insert on public.organization
  for each row execute function public.organization_seed_defaults();

-- Backfill integrations + crm_settings for orgs inserted before trigger existed
insert into public.crm_settings (organization_id)
select o.id from public.organization o
where not exists (select 1 from public.crm_settings c where c.organization_id = o.id)
on conflict (organization_id) do nothing;

insert into public.agency_sendgrid_integration (organization_id)
select o.id from public.organization o
where not exists (
  select 1 from public.agency_sendgrid_integration s where s.organization_id = o.id
)
on conflict (organization_id) do nothing;

insert into public.agency_twilio_integration (organization_id)
select o.id from public.organization o
where not exists (
  select 1 from public.agency_twilio_integration s where s.organization_id = o.id
)
on conflict (organization_id) do nothing;

-- ── DROP + recreate agency RLS policies (organization scoped) ────────────────

drop policy if exists "agency_all_client" on public.client;
create policy "agency_all_client" on public.client for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_all_lead" on public.lead;
create policy "agency_all_lead" on public.lead for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_all_project" on public.project;
create policy "agency_all_project" on public.project for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_all_task" on public.task;
create policy "agency_all_task" on public.task for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_all_appointment" on public.appointment;
create policy "agency_all_appointment" on public.appointment for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_all_transaction" on public.transaction;
create policy "agency_all_transaction" on public.transaction for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_all_goal" on public.goal;
create policy "agency_all_goal" on public.goal for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_all_deal" on public.deal;
create policy "agency_all_deal" on public.deal for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_all_conversation" on public.conversation;
create policy "agency_all_conversation" on public.conversation for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_all_conversation_message" on public.conversation_message;
create policy "agency_all_conversation_message" on public.conversation_message for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_all_income_source" on public.income_source;
create policy "agency_all_income_source" on public.income_source for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_all_income_entry" on public.income_entry;
create policy "agency_all_income_entry" on public.income_entry for all
  using (
    exists (
      select 1 from public.income_source s
      where s.id = income_entry.income_source_id
        and public.is_agency_staff()
        and s.organization_id = public.current_organization_id()
        and income_entry.organization_id = s.organization_id
    )
  )
  with check (
    exists (
      select 1 from public.income_source s
      where s.id = income_entry.income_source_id
        and public.is_agency_staff()
        and s.organization_id = public.current_organization_id()
        and income_entry.organization_id = s.organization_id
    )
  );

drop policy if exists "agency_all_fixed_expense" on public.fixed_expense;
create policy "agency_all_fixed_expense" on public.fixed_expense for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_all_variable_expense_entry" on public.variable_expense_entry;
create policy "agency_all_variable_expense_entry" on public.variable_expense_entry for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_all_proposal" on public.proposal;
create policy "agency_all_proposal" on public.proposal for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_all_proposal_line_item" on public.proposal_line_item;
create policy "agency_all_proposal_line_item" on public.proposal_line_item for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_all_contract" on public.contract;
create policy "agency_all_contract" on public.contract for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_all_prospect_preview" on public.prospect_preview;
create policy "agency_all_prospect_preview" on public.prospect_preview for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_all_prospect_intel_report" on public.prospect_intel_report;
create policy "agency_all_prospect_intel_report" on public.prospect_intel_report for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_all_life_task" on public.life_task;
create policy "agency_all_life_task" on public.life_task for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_all_life_area_status" on public.life_area_status;
create policy "agency_all_life_area_status" on public.life_area_status for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_all_issue" on public.issue;
create policy "agency_all_issue" on public.issue for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_all_lead_tag" on public.lead_tag;
create policy "agency_all_lead_tag" on public.lead_tag for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_all_lead_tag_assignment" on public.lead_tag_assignment;
create policy "agency_all_lead_tag_assignment" on public.lead_tag_assignment for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_all_prospect_signal_hit" on public.prospect_signal_hit;
create policy "agency_all_prospect_signal_hit" on public.prospect_signal_hit for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_all_prospect_signal_monitor_run" on public.prospect_signal_monitor_run;
create policy "agency_all_prospect_signal_monitor_run" on public.prospect_signal_monitor_run for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_staff_crm_product_service_all" on public.crm_product_service;
create policy "agency_staff_crm_product_service_all" on public.crm_product_service for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_staff_sales_proposal_all" on public.sales_proposal;
create policy "agency_staff_sales_proposal_all" on public.sales_proposal for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_staff_sales_proposal_catalog_line_all" on public.sales_proposal_catalog_line;
create policy "agency_staff_sales_proposal_catalog_line_all"
  on public.sales_proposal_catalog_line for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

-- Product manager subtree
drop policy if exists "agency_all_project_discovery_section" on public.project_discovery_section;
drop policy if exists "agency_all_project_roadmap_phase" on public.project_roadmap_phase;
drop policy if exists "agency_all_project_sprint" on public.project_sprint;
drop policy if exists "agency_all_project_release" on public.project_release;
drop policy if exists "agency_all_project_work_item" on public.project_work_item;
drop policy if exists "agency_all_project_manager_resource" on public.project_manager_resource;
drop policy if exists "agency_all_project_workflow_status" on public.project_workflow_status;

create policy "agency_all_project_discovery_section" on public.project_discovery_section for all
  using (public.is_agency_staff() and organization_id = public.current_organization_id())
  with check (public.is_agency_staff() and organization_id = public.current_organization_id());

create policy "agency_all_project_roadmap_phase" on public.project_roadmap_phase for all
  using (public.is_agency_staff() and organization_id = public.current_organization_id())
  with check (public.is_agency_staff() and organization_id = public.current_organization_id());

create policy "agency_all_project_sprint" on public.project_sprint for all
  using (public.is_agency_staff() and organization_id = public.current_organization_id())
  with check (public.is_agency_staff() and organization_id = public.current_organization_id());

create policy "agency_all_project_release" on public.project_release for all
  using (public.is_agency_staff() and organization_id = public.current_organization_id())
  with check (public.is_agency_staff() and organization_id = public.current_organization_id());

create policy "agency_all_project_work_item" on public.project_work_item for all
  using (public.is_agency_staff() and organization_id = public.current_organization_id())
  with check (public.is_agency_staff() and organization_id = public.current_organization_id());

create policy "agency_all_project_manager_resource" on public.project_manager_resource for all
  using (public.is_agency_staff() and organization_id = public.current_organization_id())
  with check (public.is_agency_staff() and organization_id = public.current_organization_id());

create policy "agency_all_project_workflow_status" on public.project_workflow_status for all
  using (public.is_agency_staff() and organization_id = public.current_organization_id())
  with check (public.is_agency_staff() and organization_id = public.current_organization_id());

-- CRM settings singleton per org
drop policy if exists "agency_crm_settings_all" on public.crm_settings;
create policy "agency_crm_settings_all" on public.crm_settings for all
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

-- Integrations per org
drop policy if exists "agency_staff_sendgrid_select" on public.agency_sendgrid_integration;
drop policy if exists "agency_staff_sendgrid_insert" on public.agency_sendgrid_integration;
drop policy if exists "agency_staff_sendgrid_update" on public.agency_sendgrid_integration;
create policy "agency_staff_sendgrid_select" on public.agency_sendgrid_integration for select
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );
create policy "agency_staff_sendgrid_insert" on public.agency_sendgrid_integration for insert
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );
create policy "agency_staff_sendgrid_update" on public.agency_sendgrid_integration for update
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_staff_twilio_select" on public.agency_twilio_integration;
drop policy if exists "agency_staff_twilio_insert" on public.agency_twilio_integration;
drop policy if exists "agency_staff_twilio_update" on public.agency_twilio_integration;
create policy "agency_staff_twilio_select" on public.agency_twilio_integration for select
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );
create policy "agency_staff_twilio_insert" on public.agency_twilio_integration for insert
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );
create policy "agency_staff_twilio_update" on public.agency_twilio_integration for update
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  )
  with check (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

drop policy if exists "agency_staff_sendgrid_inbound_log_select" on public.sendgrid_inbound_log;
create policy "agency_staff_sendgrid_inbound_log_select" on public.sendgrid_inbound_log for select
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

-- Docs
drop policy if exists "agency_workspace_doc_select" on public.agency_workspace_doc;
drop policy if exists "agency_workspace_doc_insert" on public.agency_workspace_doc;
drop policy if exists "agency_workspace_doc_update" on public.agency_workspace_doc;
drop policy if exists "agency_workspace_doc_delete" on public.agency_workspace_doc;

create policy "agency_workspace_doc_select" on public.agency_workspace_doc for select
  using (public.is_agency_staff() and organization_id = public.current_organization_id());
create policy "agency_workspace_doc_insert" on public.agency_workspace_doc for insert
  with check (public.is_agency_staff() and organization_id = public.current_organization_id());
create policy "agency_workspace_doc_update" on public.agency_workspace_doc for update
  using (public.is_agency_staff() and organization_id = public.current_organization_id())
  with check (public.is_agency_staff() and organization_id = public.current_organization_id());
create policy "agency_workspace_doc_delete" on public.agency_workspace_doc for delete
  using (public.is_agency_staff() and organization_id = public.current_organization_id());

drop policy if exists "agency_custom_doc_select" on public.agency_custom_doc;
drop policy if exists "agency_custom_doc_insert" on public.agency_custom_doc;
drop policy if exists "agency_custom_doc_update" on public.agency_custom_doc;
drop policy if exists "agency_custom_doc_delete" on public.agency_custom_doc;

create policy "agency_custom_doc_select" on public.agency_custom_doc for select
  using (public.is_agency_staff() and organization_id = public.current_organization_id());
create policy "agency_custom_doc_insert" on public.agency_custom_doc for insert
  with check (public.is_agency_staff() and organization_id = public.current_organization_id());
create policy "agency_custom_doc_update" on public.agency_custom_doc for update
  using (public.is_agency_staff() and organization_id = public.current_organization_id())
  with check (public.is_agency_staff() and organization_id = public.current_organization_id());
create policy "agency_custom_doc_delete" on public.agency_custom_doc for delete
  using (public.is_agency_staff() and organization_id = public.current_organization_id());

drop policy if exists "agency_doc_hub_card_select" on public.agency_doc_hub_card;
drop policy if exists "agency_doc_hub_card_insert" on public.agency_doc_hub_card;
drop policy if exists "agency_doc_hub_card_update" on public.agency_doc_hub_card;
drop policy if exists "agency_doc_hub_card_delete" on public.agency_doc_hub_card;

create policy "agency_doc_hub_card_select" on public.agency_doc_hub_card for select
  using (public.is_agency_staff() and organization_id = public.current_organization_id());
create policy "agency_doc_hub_card_insert" on public.agency_doc_hub_card for insert
  with check (public.is_agency_staff() and organization_id = public.current_organization_id());
create policy "agency_doc_hub_card_update" on public.agency_doc_hub_card for update
  using (public.is_agency_staff() and organization_id = public.current_organization_id())
  with check (public.is_agency_staff() and organization_id = public.current_organization_id());
create policy "agency_doc_hub_card_delete" on public.agency_doc_hub_card for delete
  using (public.is_agency_staff() and organization_id = public.current_organization_id());

-- Profiles: agency peers only within same organization
drop policy if exists "agency_select_profiles" on public.profiles;
create policy "agency_select_profiles" on public.profiles for select
  using (
    public.is_agency_staff()
    and organization_id = public.current_organization_id()
  );

-- Client-visible issue/policy tightened with org match
drop policy if exists "client_select_issue" on public.issue;
create policy "client_select_issue" on public.issue for select
  using (
    exists (
      select 1
      from public.project pr
      join public.profiles p on p.client_id = pr.client_id
      where pr.id = issue.project_id
        and p.id = auth.uid()
        and p.role = 'client'
        and pr.organization_id = p.organization_id
        and issue.organization_id = pr.organization_id
    )
  );

drop policy if exists "client_select_project" on public.project;
create policy "client_select_project" on public.project for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'client'
        and p.client_id = project.client_id
        and p.organization_id = project.organization_id
    )
  );

drop policy if exists "client_select_task" on public.task;
create policy "client_select_task" on public.task for select
  using (
    task.client_visible = true
    and exists (
      select 1
      from public.project pr
      join public.profiles p on p.client_id = pr.client_id
      where pr.id = task.project_id
        and p.id = auth.uid()
        and p.role = 'client'
        and pr.organization_id = p.organization_id
        and task.organization_id = pr.organization_id
    )
  );

alter table public.organization enable row level security;

drop policy if exists "organization_select_member" on public.organization;
create policy "organization_select_member" on public.organization for select
  using (id = public.current_organization_id());

grant select on public.organization to authenticated;