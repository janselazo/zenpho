-- User / team isolation for operational data.
--
-- Roles:
--   super_admin: reserved for janse.lazo@gmail.com and @zenpho.com users.
--   admin: team/workspace owner; sees records in their organization.
--   user: team member; sees owned/assigned/personal records.
--
-- Legacy roles remain accepted during migration:
--   agency_admin -> admin
--   agency_member -> user
--   client remains portal-only.

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('super_admin', 'admin', 'user', 'agency_admin', 'agency_member', 'client'));

update public.profiles
set role = 'super_admin'
where lower(coalesce(email, '')) = 'janse.lazo@gmail.com'
   or lower(coalesce(email, '')) like '%@zenpho.com';

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or lower(coalesce(p.email, '')) = 'janse.lazo@gmail.com'
        or lower(coalesce(p.email, '')) like '%@zenpho.com'
      )
  );
$$;

create or replace function public.is_agency_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'user', 'agency_admin', 'agency_member')
  );
$$;

create or replace function public.is_team_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'agency_admin')
    );
$$;

create or replace function public.can_access_org(target_org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_super_admin()
    or (
      target_org is not null
      and public.is_agency_staff()
      and target_org = public.current_organization_id()
    );
$$;

create or replace function public.can_manage_org(target_org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_super_admin()
    or (
      target_org is not null
      and public.is_team_admin()
      and target_org = public.current_organization_id()
    );
$$;

grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_team_admin() to authenticated;
grant execute on function public.can_access_org(uuid) to authenticated;
grant execute on function public.can_manage_org(uuid) to authenticated;

-- Owner columns for root CRM entities that previously relied only on org scope.
alter table public.client add column if not exists owner_id uuid references auth.users (id) on delete set null;
alter table public.project add column if not exists owner_id uuid references auth.users (id) on delete set null;
alter table public.task add column if not exists owner_id uuid references auth.users (id) on delete set null;
alter table public.deal add column if not exists owner_id uuid references auth.users (id) on delete set null;
alter table public.conversation add column if not exists owner_id uuid references auth.users (id) on delete set null;
alter table public.conversation_message add column if not exists owner_id uuid references auth.users (id) on delete set null;
alter table public.proposal add column if not exists owner_id uuid references auth.users (id) on delete set null;
alter table public.contract add column if not exists owner_id uuid references auth.users (id) on delete set null;
alter table public.sales_proposal add column if not exists owner_id uuid references auth.users (id) on delete set null;
alter table public.transaction add column if not exists owner_id uuid references auth.users (id) on delete set null;

-- Backfill ownership from the lead/client/project graph.
update public.client c
set owner_id = l.owner_id
from public.lead l
where c.owner_id is null
  and l.converted_client_id = c.id
  and l.owner_id is not null;

update public.project p
set owner_id = c.owner_id
from public.client c
where p.owner_id is null
  and p.client_id = c.id
  and c.owner_id is not null;

update public.project child
set owner_id = parent.owner_id
from public.project parent
where child.owner_id is null
  and child.parent_project_id = parent.id
  and parent.owner_id is not null;

update public.task t
set owner_id = p.owner_id
from public.project p
where t.owner_id is null
  and t.project_id = p.id
  and p.owner_id is not null;

update public.deal d
set owner_id = l.owner_id
from public.lead l
where d.owner_id is null
  and d.lead_id = l.id
  and l.owner_id is not null;

update public.appointment a
set created_by = coalesce(
  a.created_by,
  (select l.owner_id from public.lead l where l.id = a.lead_id),
  (select c.owner_id from public.client c where c.id = a.client_id),
  (select p.owner_id from public.project p where p.id = a.project_id)
)
where a.created_by is null;

update public.conversation cv
set owner_id = coalesce(
  (select l.owner_id from public.lead l where l.id = cv.lead_id),
  (select c.owner_id from public.client c where c.id = cv.client_id)
)
where cv.owner_id is null;

update public.conversation_message m
set owner_id = cv.owner_id
from public.conversation cv
where m.owner_id is null
  and m.conversation_id = cv.id
  and cv.owner_id is not null;

update public.proposal pr
set owner_id = coalesce(pr.created_by, c.owner_id)
from public.client c
where pr.owner_id is null
  and pr.client_id = c.id;

update public.contract ct
set owner_id = pr.owner_id
from public.proposal pr
where ct.owner_id is null
  and ct.proposal_id = pr.id
  and pr.owner_id is not null;

update public.sales_proposal sp
set owner_id = coalesce(
  sp.created_by,
  (select l.owner_id from public.lead l where l.id = sp.lead_id),
  (select c.owner_id from public.client c where c.id = sp.client_id)
)
where sp.owner_id is null;

update public.transaction tr
set owner_id = p.owner_id
from public.project p
where tr.owner_id is null
  and tr.project_id = p.id
  and p.owner_id is not null;

update public.transaction tr
set owner_id = s.user_id
from public.income_entry ie
join public.income_source s on s.id = ie.income_source_id
where tr.owner_id is null
  and tr.description like 'ie:' || ie.id::text || ':%';

-- Fallback: preserve existing legacy-org rows by assigning unowned records to the
-- first admin in their organization. This prevents accidental public/team leakage
-- while keeping historical data reachable by an admin.
with org_admin as (
  select distinct on (organization_id) organization_id, id as user_id
  from public.profiles
  where role in ('super_admin', 'admin', 'agency_admin')
  order by organization_id, id
)
update public.client c
set owner_id = oa.user_id
from org_admin oa
where c.owner_id is null
  and c.organization_id = oa.organization_id;

with org_admin as (
  select distinct on (organization_id) organization_id, id as user_id
  from public.profiles
  where role in ('super_admin', 'admin', 'agency_admin')
  order by organization_id, id
)
update public.project p
set owner_id = oa.user_id
from org_admin oa
where p.owner_id is null
  and p.organization_id = oa.organization_id;

with org_admin as (
  select distinct on (organization_id) organization_id, id as user_id
  from public.profiles
  where role in ('super_admin', 'admin', 'agency_admin')
  order by organization_id, id
)
update public.deal d
set owner_id = oa.user_id
from org_admin oa
where d.owner_id is null
  and d.organization_id = oa.organization_id;

create index if not exists lead_owner_org_created_idx
  on public.lead (owner_id, organization_id, created_at desc);
create index if not exists client_owner_org_created_idx
  on public.client (owner_id, organization_id, created_at desc);
create index if not exists project_owner_org_created_idx
  on public.project (owner_id, organization_id, created_at desc);
create index if not exists task_owner_project_idx
  on public.task (owner_id, project_id);
create index if not exists appointment_created_by_org_starts_idx
  on public.appointment (created_by, organization_id, starts_at desc);
create index if not exists deal_owner_org_updated_idx
  on public.deal (owner_id, organization_id, updated_at desc);
create index if not exists conversation_owner_org_last_idx
  on public.conversation (owner_id, organization_id, last_message_at desc);
create index if not exists proposal_owner_org_updated_idx
  on public.proposal (owner_id, organization_id, updated_at desc);
create index if not exists sales_proposal_owner_org_updated_idx
  on public.sales_proposal (owner_id, organization_id, updated_at desc);
create index if not exists transaction_owner_org_date_idx
  on public.transaction (owner_id, organization_id, date desc);

-- Policy helpers: Admin sees their team; User sees owned/personal records.
drop policy if exists "agency_all_lead" on public.lead;
create policy "agency_all_lead" on public.lead for all
  using (
    public.is_super_admin()
    or (
      public.is_team_admin()
      and organization_id = public.current_organization_id()
    )
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and owner_id = auth.uid()
    )
  )
  with check (
    public.is_super_admin()
    or (
      public.is_team_admin()
      and organization_id = public.current_organization_id()
    )
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and owner_id = auth.uid()
    )
  );

drop policy if exists "agency_all_client" on public.client;
create policy "agency_all_client" on public.client for all
  using (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and owner_id = auth.uid()
    )
  )
  with check (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and owner_id = auth.uid()
    )
  );

drop policy if exists "agency_all_project" on public.project;
create policy "agency_all_project" on public.project for all
  using (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and (owner_id = auth.uid() or assigned_to = auth.uid())
    )
  )
  with check (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and coalesce(owner_id, auth.uid()) = auth.uid()
    )
  );

drop policy if exists "agency_all_task" on public.task;
create policy "agency_all_task" on public.task for all
  using (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and (owner_id = auth.uid() or assigned_to = auth.uid())
    )
  )
  with check (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and coalesce(owner_id, auth.uid()) = auth.uid()
    )
  );

drop policy if exists "agency_all_appointment" on public.appointment;
create policy "agency_all_appointment" on public.appointment for all
  using (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and created_by = auth.uid()
    )
  )
  with check (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and created_by = auth.uid()
    )
  );

drop policy if exists "agency_all_deal" on public.deal;
create policy "agency_all_deal" on public.deal for all
  using (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and owner_id = auth.uid()
    )
  )
  with check (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and owner_id = auth.uid()
    )
  );

drop policy if exists "agency_all_conversation" on public.conversation;
create policy "agency_all_conversation" on public.conversation for all
  using (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and owner_id = auth.uid()
    )
  )
  with check (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and owner_id = auth.uid()
    )
  );

drop policy if exists "agency_all_conversation_message" on public.conversation_message;
create policy "agency_all_conversation_message" on public.conversation_message for all
  using (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and owner_id = auth.uid()
    )
  )
  with check (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and owner_id = auth.uid()
    )
  );

drop policy if exists "agency_all_proposal" on public.proposal;
create policy "agency_all_proposal" on public.proposal for all
  using (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and (owner_id = auth.uid() or created_by = auth.uid())
    )
  )
  with check (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and coalesce(owner_id, created_by, auth.uid()) = auth.uid()
    )
  );

drop policy if exists "agency_all_contract" on public.contract;
create policy "agency_all_contract" on public.contract for all
  using (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and owner_id = auth.uid()
    )
  )
  with check (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and owner_id = auth.uid()
    )
  );

create or replace function public.accept_proposal(p_proposal_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
  terms text;
  st text;
  proposal_owner uuid;
  proposal_org uuid;
begin
  if auth.uid() is null or not public.is_agency_staff() then
    raise exception 'forbidden';
  end if;

  select status, coalesce(notes, ''), owner_id, organization_id
  into st, terms, proposal_owner, proposal_org
  from public.proposal
  where id = p_proposal_id
  for update;

  if st is null then
    raise exception 'not_found';
  end if;

  if not (
    public.can_manage_org(proposal_org)
    or (
      proposal_org = public.current_organization_id()
      and coalesce(proposal_owner, auth.uid()) = auth.uid()
    )
  ) then
    raise exception 'forbidden';
  end if;

  if st = 'accepted' then
    select c.id into cid
    from public.contract c
    where c.proposal_id = p_proposal_id;
    if cid is null then
      insert into public.contract (proposal_id, status, terms_snapshot, owner_id, organization_id)
      values (p_proposal_id, 'draft', nullif(trim(terms), ''), proposal_owner, proposal_org)
      returning id into cid;
    end if;
    return cid;
  end if;

  if st not in ('draft', 'sent', 'pending') then
    raise exception 'invalid_status';
  end if;

  update public.proposal
  set status = 'accepted', updated_at = now()
  where id = p_proposal_id;

  insert into public.contract (proposal_id, status, terms_snapshot, owner_id, organization_id)
  values (p_proposal_id, 'draft', nullif(trim(terms), ''), proposal_owner, proposal_org)
  on conflict (proposal_id) do nothing
  returning id into cid;

  if cid is null then
    select c.id into cid
    from public.contract c
    where c.proposal_id = p_proposal_id;
  end if;

  return cid;
end;
$$;

drop policy if exists "agency_all_proposal_line_item" on public.proposal_line_item;
create policy "agency_all_proposal_line_item" on public.proposal_line_item for all
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.proposal pr
      where pr.id = proposal_line_item.proposal_id
        and (
          public.can_manage_org(pr.organization_id)
          or (
            public.is_agency_staff()
            and pr.organization_id = public.current_organization_id()
            and (pr.owner_id = auth.uid() or pr.created_by = auth.uid())
          )
        )
    )
  )
  with check (
    public.is_super_admin()
    or exists (
      select 1 from public.proposal pr
      where pr.id = proposal_line_item.proposal_id
        and (
          public.can_manage_org(pr.organization_id)
          or (
            public.is_agency_staff()
            and pr.organization_id = public.current_organization_id()
            and (pr.owner_id = auth.uid() or pr.created_by = auth.uid())
          )
        )
    )
  );

drop policy if exists "agency_staff_sales_proposal_all" on public.sales_proposal;
drop policy if exists "agency_all_sales_proposal" on public.sales_proposal;
create policy "agency_all_sales_proposal" on public.sales_proposal for all
  using (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and (owner_id = auth.uid() or created_by = auth.uid())
    )
  )
  with check (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and coalesce(owner_id, created_by, auth.uid()) = auth.uid()
    )
  );

drop policy if exists "agency_staff_sales_proposal_catalog_line_all" on public.sales_proposal_catalog_line;
drop policy if exists "agency_all_sales_proposal_catalog_line" on public.sales_proposal_catalog_line;
create policy "agency_all_sales_proposal_catalog_line" on public.sales_proposal_catalog_line for all
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.sales_proposal sp
      where sp.id = sales_proposal_catalog_line.sales_proposal_id
        and (
          public.can_manage_org(sp.organization_id)
          or (
            public.is_agency_staff()
            and sp.organization_id = public.current_organization_id()
            and (sp.owner_id = auth.uid() or sp.created_by = auth.uid())
          )
        )
    )
  )
  with check (
    public.is_super_admin()
    or exists (
      select 1 from public.sales_proposal sp
      where sp.id = sales_proposal_catalog_line.sales_proposal_id
        and (
          public.can_manage_org(sp.organization_id)
          or (
            public.is_agency_staff()
            and sp.organization_id = public.current_organization_id()
            and (sp.owner_id = auth.uid() or sp.created_by = auth.uid())
          )
        )
    )
  );

drop policy if exists "agency_all_prospect_preview" on public.prospect_preview;
create policy "agency_all_prospect_preview" on public.prospect_preview for all
  using (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and user_id = auth.uid()
    )
  )
  with check (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and user_id = auth.uid()
    )
  );

drop policy if exists "agency_all_prospect_intel_report" on public.prospect_intel_report;
create policy "agency_all_prospect_intel_report" on public.prospect_intel_report for all
  using (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and user_id = auth.uid()
    )
  )
  with check (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and user_id = auth.uid()
    )
  );

-- Personal finance is user-scoped.
drop policy if exists "agency_all_income_source" on public.income_source;
create policy "agency_all_income_source" on public.income_source for all
  using (public.is_super_admin() or user_id = auth.uid())
  with check (public.is_super_admin() or user_id = auth.uid());

drop policy if exists "agency_all_income_entry" on public.income_entry;
create policy "agency_all_income_entry" on public.income_entry for all
  using (
    public.is_super_admin()
    or exists (
      select 1 from public.income_source s
      where s.id = income_entry.income_source_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    public.is_super_admin()
    or exists (
      select 1 from public.income_source s
      where s.id = income_entry.income_source_id
        and s.user_id = auth.uid()
    )
  );

drop policy if exists "agency_all_fixed_expense" on public.fixed_expense;
create policy "agency_all_fixed_expense" on public.fixed_expense for all
  using (public.is_super_admin() or user_id = auth.uid())
  with check (public.is_super_admin() or user_id = auth.uid());

drop policy if exists "agency_all_variable_expense_entry" on public.variable_expense_entry;
create policy "agency_all_variable_expense_entry" on public.variable_expense_entry for all
  using (public.is_super_admin() or user_id = auth.uid())
  with check (public.is_super_admin() or user_id = auth.uid());

drop policy if exists "agency_all_transaction" on public.transaction;
create policy "agency_all_transaction" on public.transaction for all
  using (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and owner_id = auth.uid()
    )
  )
  with check (
    public.can_manage_org(organization_id)
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
      and coalesce(owner_id, auth.uid()) = auth.uid()
    )
  );

-- Keep finance-derived transaction rows user-scoped.
create or replace function public.sync_income_entry_to_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_user uuid;
begin
  if tg_op = 'DELETE' then
    delete from public.transaction
      where category = 'income_entry'
        and description like 'ie:' || old.id::text || ':%';
    return old;
  end if;

  select s.user_id into source_user
  from public.income_source s
  where s.id = new.income_source_id;

  delete from public.transaction
    where category = 'income_entry'
      and description like 'ie:' || new.id::text || ':%';

  if new.revenue > 0 then
    insert into public.transaction (type, amount, category, description, date, owner_id)
    values ('revenue', new.revenue, 'income_entry', 'ie:' || new.id::text || ':rev', new.month, source_user);
  end if;

  if new.expenses > 0 then
    insert into public.transaction (type, amount, category, description, date, owner_id)
    values ('expense', new.expenses, 'income_entry', 'ie:' || new.id::text || ':exp', new.month, source_user);
  end if;

  return new;
end;
$$;
