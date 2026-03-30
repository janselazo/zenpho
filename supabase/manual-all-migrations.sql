-- =============================================================================
-- MANUAL APPLY — Supabase Dashboard → SQL → New query
-- =============================================================================
-- Run in ONE session from top to bottom on a FRESH project, OR run only the
-- sections you have not applied yet (skip any block that errors on "already exists").
-- Source of truth: supabase/migrations/*.sql (keep in sync when you change schema).
-- =============================================================================

-- ----- 20250321000000_init_crm.sql -----
create extension if not exists "pgcrypto";

create table public.client (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  company text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.lead (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  company text,
  source text,
  stage text not null default 'new',
  notes text,
  owner_id uuid references auth.users (id) on delete set null,
  converted_client_id uuid references public.client (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.project (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.client (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'active',
  assigned_to uuid references auth.users (id) on delete set null,
  start_date date,
  target_date date,
  created_at timestamptz not null default now()
);

create table public.task (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.project (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo',
  sort_order int not null default 0,
  client_visible boolean not null default false,
  assigned_to uuid references auth.users (id) on delete set null,
  due_date date,
  created_at timestamptz not null default now()
);

create table public.appointment (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  lead_id uuid references public.lead (id) on delete set null,
  client_id uuid references public.client (id) on delete set null,
  project_id uuid references public.project (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.transaction (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('revenue', 'expense')),
  amount numeric(12, 2) not null,
  category text,
  description text,
  date date not null default (current_date),
  project_id uuid references public.project (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.goal (
  id uuid primary key default gen_random_uuid(),
  metric text not null,
  period text not null,
  target numeric(12, 2) not null,
  actual numeric(12, 2) not null default 0,
  period_start date not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'agency_member'
    check (role in ('agency_admin', 'agency_member', 'client')),
  client_id uuid references public.client (id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(
      nullif(new.raw_user_meta_data->>'role', ''),
      'agency_member'
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.client enable row level security;
alter table public.lead enable row level security;
alter table public.project enable row level security;
alter table public.task enable row level security;
alter table public.appointment enable row level security;
alter table public.transaction enable row level security;
alter table public.goal enable row level security;
alter table public.profiles enable row level security;

create or replace function public.is_agency_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('agency_admin', 'agency_member')
  );
$$;

create policy "agency_all_client"
  on public.client for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

create policy "agency_all_lead"
  on public.lead for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

create policy "agency_all_project"
  on public.project for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

create policy "agency_all_task"
  on public.task for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

create policy "agency_all_appointment"
  on public.appointment for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

create policy "agency_all_transaction"
  on public.transaction for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

create policy "agency_all_goal"
  on public.goal for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

create policy "client_select_project"
  on public.project for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'client'
        and p.client_id = project.client_id
    )
  );

create policy "client_select_task"
  on public.task for select
  using (
    task.client_visible = true
    and exists (
      select 1
      from public.project pr
      join public.profiles p on p.client_id = pr.client_id
      where pr.id = task.project_id
        and p.id = auth.uid()
        and p.role = 'client'
    )
  );

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "agency_select_profiles"
  on public.profiles for select
  using (public.is_agency_staff());

-- ----- 20260322120000_lead_deal.sql -----
create table public.deal (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.lead (id) on delete cascade,
  title text,
  company text,
  value numeric(12, 2),
  stage text not null default 'prospect'
    check (stage in ('prospect', 'proposal', 'negotiation', 'closed_won', 'closed_lost')),
  expected_close date,
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id)
);

create index deal_lead_id_idx on public.deal (lead_id);

alter table public.deal enable row level security;

create policy "agency_all_deal"
  on public.deal for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

-- ----- 20260323120000_lead_project_type.sql -----
alter table public.lead
  add column if not exists project_type text;

-- ----- 20260324120000_profiles_phone_avatar_storage.sql -----
alter table public.profiles
  add column if not exists phone text;

alter table public.profiles
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "avatars_insert_own_folder" on storage.objects;
drop policy if exists "avatars_update_own_folder" on storage.objects;
drop policy if exists "avatars_delete_own_folder" on storage.objects;

create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_insert_own_folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own_folder"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own_folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----- 20260325120000_profiles_phone_avatar_columns.sql -----
alter table public.profiles
  add column if not exists phone text;

alter table public.profiles
  add column if not exists avatar_url text;

-- ----- 20260326120000_deal_website.sql -----
alter table public.deal
  add column if not exists website text;

-- ----- 20260327120000_user_prospecting_playbook.sql -----
create table public.user_prospecting_playbook (
  user_id uuid primary key references auth.users (id) on delete cascade,
  categories jsonb not null default '[]'::jsonb,
  completions jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index user_prospecting_playbook_updated_at_idx
  on public.user_prospecting_playbook (updated_at desc);

alter table public.user_prospecting_playbook enable row level security;

create policy "user_prospecting_playbook_select_own"
  on public.user_prospecting_playbook for select
  using (auth.uid() = user_id);

create policy "user_prospecting_playbook_insert_own"
  on public.user_prospecting_playbook for insert
  with check (auth.uid() = user_id);

create policy "user_prospecting_playbook_update_own"
  on public.user_prospecting_playbook for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_prospecting_playbook_delete_own"
  on public.user_prospecting_playbook for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_prospecting_playbook to authenticated;

-- ----- 20260328120000_conversations.sql -----
create table public.conversation (
  id uuid primary key default gen_random_uuid(),
  contact_name text not null,
  channel text not null default 'other'
    check (channel in (
      'email',
      'whatsapp',
      'sms',
      'facebook_messenger',
      'instagram',
      'linkedin',
      'x',
      'paid_ads',
      'other'
    )),
  lead_id uuid references public.lead (id) on delete set null,
  client_id uuid references public.client (id) on delete set null,
  last_message_at timestamptz not null default now(),
  unread_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_message (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversation (id) on delete cascade,
  kind text not null default 'external'
    check (kind in ('external', 'internal', 'system')),
  direction text not null default 'inbound'
    check (direction in ('inbound', 'outbound')),
  body text,
  sender_name text,
  sender_avatar_url text,
  attachment jsonb,
  created_at timestamptz not null default now()
);

create index conversation_last_message_idx on public.conversation (last_message_at desc);
create index conversation_message_conversation_idx on public.conversation_message (conversation_id, created_at);

alter table public.conversation enable row level security;
alter table public.conversation_message enable row level security;

create policy "agency_all_conversation"
  on public.conversation for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

create policy "agency_all_conversation_message"
  on public.conversation_message for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

insert into public.conversation (id, contact_name, channel, last_message_at, unread_count)
values
  (
    'a0000000-0000-4000-8000-000000000001',
    'Washim Chowdhury',
    'whatsapp',
    now() - interval '5 minutes',
    2
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    'Wei Chen',
    'email',
    now() - interval '2 hours',
    0
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    'Acme Corp — Ads',
    'paid_ads',
    now() - interval '1 day',
    1
  );

insert into public.conversation_message (
  conversation_id,
  kind,
  direction,
  body,
  sender_name,
  attachment,
  created_at
)
values
  (
    'a0000000-0000-4000-8000-000000000001',
    'external',
    'inbound',
    'Here is the brief you asked for.',
    'Tony Stark',
    '{"name": "Brief.doc", "size_kb": 178, "url": null}'::jsonb,
    now() - interval '40 minutes'
  ),
  (
    'a0000000-0000-4000-8000-000000000001',
    'external',
    'outbound',
    'Thanks — reviewing now and I will get back by EOD.',
    'You',
    null,
    now() - interval '35 minutes'
  ),
  (
    'a0000000-0000-4000-8000-000000000001',
    'external',
    'inbound',
    '[voice]',
    'Wei Chen',
    null,
    now() - interval '5 minutes'
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    'external',
    'inbound',
    'Can we reschedule the discovery call to Thursday?',
    'Wei Chen',
    null,
    now() - interval '2 hours'
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    'internal',
    'outbound',
    'Follow up on pricing — they are comparing two vendors.',
    'Internal',
    null,
    now() - interval '1 hour'
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    'external',
    'inbound',
    'New lead message from campaign: Summer Promo',
    'Facebook Lead',
    null,
    now() - interval '1 day'
  );

-- ----- 20260329120000_lead_stage_remove_won_lost.sql -----
update public.lead
set stage = 'qualified'
where lower(trim(stage)) = 'won';

update public.lead
set stage = 'not_qualified'
where lower(trim(stage)) = 'lost';

-- ----- 20260330120000_deal_multiple_per_lead.sql -----
alter table public.deal drop constraint if exists deal_lead_id_key;

-- ----- 20260331120000_proposals_contracts.sql -----
create table public.proposal (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.client (id) on delete cascade,
  title text not null default '',
  status text not null default 'draft'
    check (
      status in (
        'draft',
        'sent',
        'pending',
        'accepted',
        'declined',
        'expired'
      )
    ),
  proposal_number int generated by default as identity unique not null,
  issued_at date not null default (current_date),
  valid_until date,
  discount_amount numeric(12, 2) not null default 0,
  notes text,
  payment_instructions text,
  billing_snapshot jsonb not null default '{}'::jsonb,
  agency_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index proposal_client_id_idx on public.proposal (client_id);
create index proposal_status_idx on public.proposal (status);
create index proposal_updated_at_idx on public.proposal (updated_at desc);

create table public.proposal_line_item (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposal (id) on delete cascade,
  description text not null default '',
  quantity numeric(12, 4) not null default 1
    check (quantity >= 0),
  unit_price numeric(12, 2) not null default 0
    check (unit_price >= 0),
  line_total numeric(12, 2) generated always as (quantity * unit_price) stored,
  sort_order int not null default 0
);

create index proposal_line_item_proposal_id_idx
  on public.proposal_line_item (proposal_id, sort_order);

create table public.contract (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null unique references public.proposal (id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'signed')),
  terms_snapshot text,
  signed_at timestamptz,
  signer_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index contract_proposal_id_idx on public.contract (proposal_id);

alter table public.proposal enable row level security;
alter table public.proposal_line_item enable row level security;
alter table public.contract enable row level security;

create policy "agency_all_proposal"
  on public.proposal for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

create policy "agency_all_proposal_line_item"
  on public.proposal_line_item for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

create policy "agency_all_contract"
  on public.contract for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

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
begin
  if auth.uid() is null or not public.is_agency_staff() then
    raise exception 'forbidden';
  end if;

  select status, coalesce(notes, '')
  into st, terms
  from public.proposal
  where id = p_proposal_id
  for update;

  if st is null then
    raise exception 'not_found';
  end if;

  if st = 'accepted' then
    select c.id into cid
    from public.contract c
    where c.proposal_id = p_proposal_id;
    if cid is null then
      insert into public.contract (proposal_id, status, terms_snapshot)
      values (p_proposal_id, 'draft', nullif(trim(terms), ''))
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

  insert into public.contract (proposal_id, status, terms_snapshot)
  values (p_proposal_id, 'draft', nullif(trim(terms), ''))
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

grant execute on function public.accept_proposal(uuid) to authenticated;

-- ----- 20260401120000_project_crm_fields.sql -----
alter table public.project
  add column if not exists website text;

alter table public.project
  add column if not exists budget numeric(12, 2);

alter table public.project
  add column if not exists plan_stage text not null default 'pipeline'
    check (plan_stage in ('pipeline', 'planning', 'mvp', 'growth'));

alter table public.project
  add column if not exists project_type text;

alter table public.project
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists project_client_id_created_at_idx
  on public.project (client_id, created_at desc);

-- ----- 20260402120000_time_entry.sql -----
create table if not exists public.time_entry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.project (id) on delete set null,
  task_id uuid references public.task (id) on delete set null,
  description text not null default '',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  billable boolean not null default true,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists time_entry_user_started_idx
  on public.time_entry (user_id, started_at desc);

create unique index if not exists time_entry_one_running_per_user_idx
  on public.time_entry (user_id)
  where (ended_at is null);

alter table public.time_entry enable row level security;

drop policy if exists "time_entry_select_own" on public.time_entry;
create policy "time_entry_select_own"
  on public.time_entry for select
  using (auth.uid() = user_id);

drop policy if exists "time_entry_insert_own" on public.time_entry;
create policy "time_entry_insert_own"
  on public.time_entry for insert
  with check (auth.uid() = user_id);

drop policy if exists "time_entry_update_own" on public.time_entry;
create policy "time_entry_update_own"
  on public.time_entry for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "time_entry_delete_own" on public.time_entry;
create policy "time_entry_delete_own"
  on public.time_entry for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.time_entry to authenticated;

-- ----- 20260403120000_prospect_intel_report.sql -----
create table if not exists public.prospect_intel_report (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  lead_id uuid references public.lead (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists prospect_intel_report_user_created_idx
  on public.prospect_intel_report (user_id, created_at desc);

alter table public.prospect_intel_report enable row level security;

drop policy if exists "agency_all_prospect_intel_report" on public.prospect_intel_report;
create policy "agency_all_prospect_intel_report"
  on public.prospect_intel_report for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

grant select, insert, update, delete on public.prospect_intel_report to authenticated;

-- ----- 20260405120000_agency_workspace_doc.sql -----
create table if not exists public.agency_workspace_doc (
  slug text primary key,
  body text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create index if not exists agency_workspace_doc_updated_at_idx
  on public.agency_workspace_doc (updated_at desc);

alter table public.agency_workspace_doc enable row level security;

drop policy if exists "agency_workspace_doc_select" on public.agency_workspace_doc;
create policy "agency_workspace_doc_select"
  on public.agency_workspace_doc for select
  using (public.is_agency_staff());

drop policy if exists "agency_workspace_doc_insert" on public.agency_workspace_doc;
create policy "agency_workspace_doc_insert"
  on public.agency_workspace_doc for insert
  with check (public.is_agency_staff());

drop policy if exists "agency_workspace_doc_update" on public.agency_workspace_doc;
create policy "agency_workspace_doc_update"
  on public.agency_workspace_doc for update
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

drop policy if exists "agency_workspace_doc_delete" on public.agency_workspace_doc;
create policy "agency_workspace_doc_delete"
  on public.agency_workspace_doc for delete
  using (public.is_agency_staff());

grant select, insert, update, delete on public.agency_workspace_doc to authenticated;

-- ----- 20260406120000_agency_doc_hub_card.sql -----
create table if not exists public.agency_doc_hub_card (
  slug text primary key,
  hidden boolean not null default false,
  title_override text,
  description_override text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.agency_doc_hub_card enable row level security;

drop policy if exists "agency_doc_hub_card_select" on public.agency_doc_hub_card;
create policy "agency_doc_hub_card_select"
  on public.agency_doc_hub_card for select
  using (public.is_agency_staff());

drop policy if exists "agency_doc_hub_card_insert" on public.agency_doc_hub_card;
create policy "agency_doc_hub_card_insert"
  on public.agency_doc_hub_card for insert
  with check (public.is_agency_staff());

drop policy if exists "agency_doc_hub_card_update" on public.agency_doc_hub_card;
create policy "agency_doc_hub_card_update"
  on public.agency_doc_hub_card for update
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

drop policy if exists "agency_doc_hub_card_delete" on public.agency_doc_hub_card;
create policy "agency_doc_hub_card_delete"
  on public.agency_doc_hub_card for delete
  using (public.is_agency_staff());

grant select, insert, update, delete on public.agency_doc_hub_card to authenticated;

-- ----- 20260407120000_agency_doc_hub_card_sort_order.sql -----
alter table public.agency_doc_hub_card
  add column if not exists sort_order integer;

comment on column public.agency_doc_hub_card.sort_order is
  'Lower values appear first on the hub. Null falls back to registry order.';

-- ----- 20260408120000_agency_custom_doc.sql -----
create table if not exists public.agency_custom_doc (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  icon_key text not null default 'file-text',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create index if not exists agency_custom_doc_created_at_idx
  on public.agency_custom_doc (created_at asc);

alter table public.agency_custom_doc enable row level security;

drop policy if exists "agency_custom_doc_select" on public.agency_custom_doc;
create policy "agency_custom_doc_select"
  on public.agency_custom_doc for select
  using (public.is_agency_staff());

drop policy if exists "agency_custom_doc_insert" on public.agency_custom_doc;
create policy "agency_custom_doc_insert"
  on public.agency_custom_doc for insert
  with check (public.is_agency_staff());

drop policy if exists "agency_custom_doc_update" on public.agency_custom_doc;
create policy "agency_custom_doc_update"
  on public.agency_custom_doc for update
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

drop policy if exists "agency_custom_doc_delete" on public.agency_custom_doc;
create policy "agency_custom_doc_delete"
  on public.agency_custom_doc for delete
  using (public.is_agency_staff());

grant select, insert, update, delete on public.agency_custom_doc to authenticated;

-- ----- 20260429120000_product_phase_issue.sql -----
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

-- ----- 20260430120000_saved_lead_magnet.sql -----
create table if not exists public.saved_lead_magnet (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  industry_id text not null,
  niche_id text not null,
  title text not null,
  description text not null,
  format text not null,
  angle text,
  source text not null check (source in ('generated', 'manual')),
  created_at timestamptz not null default now()
);

create index if not exists saved_lead_magnet_user_created_idx
  on public.saved_lead_magnet (user_id, created_at desc);

alter table public.saved_lead_magnet enable row level security;

create policy "saved_lead_magnet_select_own"
  on public.saved_lead_magnet for select
  using (
    public.is_agency_staff()
    and auth.uid() = user_id
  );

create policy "saved_lead_magnet_insert_own"
  on public.saved_lead_magnet for insert
  with check (
    public.is_agency_staff()
    and auth.uid() = user_id
  );

create policy "saved_lead_magnet_update_own"
  on public.saved_lead_magnet for update
  using (
    public.is_agency_staff()
    and auth.uid() = user_id
  )
  with check (
    public.is_agency_staff()
    and auth.uid() = user_id
  );

create policy "saved_lead_magnet_delete_own"
  on public.saved_lead_magnet for delete
  using (
    public.is_agency_staff()
    and auth.uid() = user_id
  );

grant select, insert, update, delete on public.saved_lead_magnet to authenticated;

-- ----- 20260430180000_issue_workspace_task_id.sql -----
alter table public.issue
  add column if not exists workspace_task_id text;

-- ----- 20260430200000_issue_category.sql -----
alter table public.issue
  add column if not exists category text not null default 'bug_report';

alter table public.issue drop constraint if exists issue_category_check;

alter table public.issue
  add constraint issue_category_check check (
    category in ('feature_request', 'bug_report', 'customer_request')
  );

-- ----- 20260430210000_product_plan_stage.sql -----
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

-- ----- 20260501120000_lead_contact_category.sql -----
alter table public.lead
  add column if not exists contact_category text;
