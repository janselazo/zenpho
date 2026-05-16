-- Facebook Lead Ads integration + lead notification dispatch.
--
-- Per-organization integration storage (App credentials, connected Pages, optional
-- per-form mapping), an audit/idempotency log for incoming leadgen webhooks, plus
-- per-user channel preferences and per-org email/SMS templates used when a new lead
-- lands in the CRM (from Facebook or any other source).

-- ── 1. Per-org Facebook integration (App credentials + webhook handshake) ──
create table if not exists public.agency_facebook_integration (
  organization_id uuid primary key references public.organization (id) on delete cascade,
  app_id text,
  app_secret_encrypted text,
  verify_token_encrypted text,
  system_user_token_encrypted text,
  webhook_secret text,
  default_lead_owner_id uuid references auth.users (id) on delete set null,
  default_lead_source text not null default 'Facebook Lead Ads',
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

comment on table public.agency_facebook_integration is
  'Per-organization Meta App credentials for Facebook Lead Ads ingestion. App secret + verify token + Page tokens are AES-GCM ciphertext from app.';

alter table public.agency_facebook_integration enable row level security;

drop policy if exists "agency_facebook_integration_select" on public.agency_facebook_integration;
drop policy if exists "agency_facebook_integration_insert" on public.agency_facebook_integration;
drop policy if exists "agency_facebook_integration_update" on public.agency_facebook_integration;
drop policy if exists "agency_facebook_integration_delete" on public.agency_facebook_integration;

create policy "agency_facebook_integration_select" on public.agency_facebook_integration for select
  using (
    public.is_super_admin()
    or (
      public.is_team_admin()
      and organization_id = public.current_organization_id()
    )
  );

create policy "agency_facebook_integration_insert" on public.agency_facebook_integration for insert
  with check (
    public.is_super_admin()
    or (
      public.is_team_admin()
      and organization_id = public.current_organization_id()
    )
  );

create policy "agency_facebook_integration_update" on public.agency_facebook_integration for update
  using (
    public.is_super_admin()
    or (
      public.is_team_admin()
      and organization_id = public.current_organization_id()
    )
  )
  with check (
    public.is_super_admin()
    or (
      public.is_team_admin()
      and organization_id = public.current_organization_id()
    )
  );

create policy "agency_facebook_integration_delete" on public.agency_facebook_integration for delete
  using (
    public.is_super_admin()
    or (
      public.is_team_admin()
      and organization_id = public.current_organization_id()
    )
  );

-- ── 2. Connected Facebook Pages (one row per Page per org) ─────────────────
create table if not exists public.agency_facebook_page (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization (id) on delete cascade,
  page_id text not null,
  page_name text,
  page_access_token_encrypted text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

comment on table public.agency_facebook_page is
  'Connected Meta Pages per organization. The webhook reverse-looks-up org by page_id (Meta sends entry[].id = Page ID).';

create unique index if not exists agency_facebook_page_page_id_key
  on public.agency_facebook_page (page_id);
create index if not exists agency_facebook_page_org_idx
  on public.agency_facebook_page (organization_id, is_active);

alter table public.agency_facebook_page enable row level security;

drop policy if exists "agency_facebook_page_all" on public.agency_facebook_page;
create policy "agency_facebook_page_all" on public.agency_facebook_page for all
  using (
    public.is_super_admin()
    or (
      public.is_team_admin()
      and organization_id = public.current_organization_id()
    )
  )
  with check (
    public.is_super_admin()
    or (
      public.is_team_admin()
      and organization_id = public.current_organization_id()
    )
  );

-- ── 3. Per-form override (optional default owner / source label per form) ──
create table if not exists public.agency_facebook_form_map (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization (id) on delete cascade,
  form_id text not null,
  default_owner_id uuid references auth.users (id) on delete set null,
  default_source_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists agency_facebook_form_map_org_form_key
  on public.agency_facebook_form_map (organization_id, form_id);

alter table public.agency_facebook_form_map enable row level security;

drop policy if exists "agency_facebook_form_map_all" on public.agency_facebook_form_map;
create policy "agency_facebook_form_map_all" on public.agency_facebook_form_map for all
  using (
    public.is_super_admin()
    or (
      public.is_team_admin()
      and organization_id = public.current_organization_id()
    )
  )
  with check (
    public.is_super_admin()
    or (
      public.is_team_admin()
      and organization_id = public.current_organization_id()
    )
  );

-- ── 4. Audit + idempotency log for inbound Meta leadgen webhooks ───────────
create table if not exists public.facebook_lead_event_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organization (id) on delete set null,
  leadgen_id text,
  page_id text,
  form_id text,
  ad_id text,
  campaign_id text,
  lead_id uuid references public.lead (id) on delete set null,
  status text not null
    check (
      status in (
        'received',
        'processed',
        'duplicate',
        'unauthorized',
        'invalid_signature',
        'unknown_page',
        'graph_error',
        'error'
      )
    ),
  payload jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create unique index if not exists facebook_lead_event_log_leadgen_id_key
  on public.facebook_lead_event_log (leadgen_id)
  where leadgen_id is not null;
create index if not exists facebook_lead_event_log_org_created_idx
  on public.facebook_lead_event_log (organization_id, created_at desc);

alter table public.facebook_lead_event_log enable row level security;

drop policy if exists "facebook_lead_event_log_select" on public.facebook_lead_event_log;
create policy "facebook_lead_event_log_select" on public.facebook_lead_event_log for select
  using (
    public.is_super_admin()
    or (
      public.is_team_admin()
      and organization_id = public.current_organization_id()
    )
  );

-- ── 5. Per-user notification preferences (email + SMS for new leads) ───────
create table if not exists public.lead_notification_preference (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email_new_lead boolean not null default true,
  sms_new_lead boolean not null default false,
  sms_phone text,
  updated_at timestamptz not null default now()
);

alter table public.lead_notification_preference enable row level security;

drop policy if exists "lead_notification_preference_select_self" on public.lead_notification_preference;
drop policy if exists "lead_notification_preference_upsert_self" on public.lead_notification_preference;
drop policy if exists "lead_notification_preference_update_self" on public.lead_notification_preference;
drop policy if exists "lead_notification_preference_delete_self" on public.lead_notification_preference;

create policy "lead_notification_preference_select_self" on public.lead_notification_preference for select
  using (
    user_id = auth.uid()
    or public.is_super_admin()
    or (
      public.is_team_admin()
      and exists (
        select 1 from public.profiles p
        where p.id = lead_notification_preference.user_id
          and p.organization_id = public.current_organization_id()
      )
    )
  );

create policy "lead_notification_preference_upsert_self" on public.lead_notification_preference for insert
  with check (user_id = auth.uid());

create policy "lead_notification_preference_update_self" on public.lead_notification_preference for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "lead_notification_preference_delete_self" on public.lead_notification_preference for delete
  using (user_id = auth.uid());

-- ── 6. Per-org email + SMS templates for new-lead notifications ────────────
create table if not exists public.lead_notification_template (
  organization_id uuid primary key references public.organization (id) on delete cascade,
  email_subject text not null default 'New lead: {{lead.name}}',
  email_html text not null default
    '<p>You have a new lead.</p><ul><li><strong>Name:</strong> {{lead.name}}</li><li><strong>Email:</strong> {{lead.email}}</li><li><strong>Phone:</strong> {{lead.phone}}</li><li><strong>Source:</strong> {{lead.source}}</li></ul><p><a href="{{lead.url}}">Open in CRM</a></p>',
  sms_body text not null default
    'New lead {{lead.name}} ({{lead.source}}). Phone: {{lead.phone}}. Open: {{lead.url}}',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.lead_notification_template enable row level security;

drop policy if exists "lead_notification_template_select" on public.lead_notification_template;
drop policy if exists "lead_notification_template_upsert" on public.lead_notification_template;
drop policy if exists "lead_notification_template_update" on public.lead_notification_template;

create policy "lead_notification_template_select" on public.lead_notification_template for select
  using (
    public.is_super_admin()
    or (
      public.is_agency_staff()
      and organization_id = public.current_organization_id()
    )
  );

create policy "lead_notification_template_upsert" on public.lead_notification_template for insert
  with check (
    public.is_super_admin()
    or (
      public.is_team_admin()
      and organization_id = public.current_organization_id()
    )
  );

create policy "lead_notification_template_update" on public.lead_notification_template for update
  using (
    public.is_super_admin()
    or (
      public.is_team_admin()
      and organization_id = public.current_organization_id()
    )
  )
  with check (
    public.is_super_admin()
    or (
      public.is_team_admin()
      and organization_id = public.current_organization_id()
    )
  );

-- ── 7. Seed singletons for new orgs (and backfill existing orgs) ───────────
create or replace function public.organization_seed_facebook_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.agency_facebook_integration (organization_id, updated_at)
  values (new.id, now())
  on conflict (organization_id) do nothing;

  insert into public.lead_notification_template (organization_id, updated_at)
  values (new.id, now())
  on conflict (organization_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_organization_seed_facebook_defaults on public.organization;
create trigger trg_organization_seed_facebook_defaults
  after insert on public.organization
  for each row execute function public.organization_seed_facebook_defaults();

insert into public.agency_facebook_integration (organization_id)
select o.id from public.organization o
where not exists (
  select 1 from public.agency_facebook_integration f where f.organization_id = o.id
)
on conflict (organization_id) do nothing;

insert into public.lead_notification_template (organization_id)
select o.id from public.organization o
where not exists (
  select 1 from public.lead_notification_template t where t.organization_id = o.id
)
on conflict (organization_id) do nothing;
