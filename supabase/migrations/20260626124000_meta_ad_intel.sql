-- Meta Ad Intelligence + Video Ads Pitch Generator persistence.

create table if not exists public.meta_page_cache (
  id uuid primary key default gen_random_uuid(),
  vanity_handle text not null unique,
  page_id text not null,
  resolved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meta_page_cache_vanity_handle_idx
  on public.meta_page_cache (vanity_handle);

create index if not exists meta_page_cache_expires_at_idx
  on public.meta_page_cache (expires_at);

create table if not exists public.prospect_ad_intel (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization (id) on delete restrict,
  user_id uuid references auth.users (id) on delete set null,
  prospect_id uuid references public.lead (id) on delete cascade,
  website_url text,
  facebook_url text,
  page_id text,
  signal text not null check (
    signal in ('RUNNING_HIGH', 'RUNNING_LOW', 'DORMANT_WITH_PIXEL', 'COLD', 'UNKNOWN')
  ),
  ad_count integer not null default 0 check (ad_count >= 0),
  oldest_ad_days_active integer check (oldest_ad_days_active is null or oldest_ad_days_active >= 0),
  platforms jsonb not null default '[]'::jsonb,
  sample_creatives jsonb not null default '[]'::jsonb,
  pixel_detected boolean not null default false,
  pixel_ids jsonb not null default '[]'::jsonb,
  outreach_angle text,
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists prospect_ad_intel_org_fetched_idx
  on public.prospect_ad_intel (organization_id, fetched_at desc);

create index if not exists prospect_ad_intel_user_fetched_idx
  on public.prospect_ad_intel (user_id, fetched_at desc);

create index if not exists prospect_ad_intel_prospect_fetched_idx
  on public.prospect_ad_intel (prospect_id, fetched_at desc);

create table if not exists public.prospect_video_thumbnails (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization (id) on delete restrict,
  user_id uuid references auth.users (id) on delete set null,
  prospect_id uuid references public.lead (id) on delete cascade,
  prospect_ad_intel_id uuid references public.prospect_ad_intel (id) on delete set null,
  business_name text,
  thumbnail_url text not null,
  prompt text not null,
  hook_text text not null,
  cta_text text not null,
  hook_lang text not null default 'en' check (hook_lang in ('en', 'es')),
  generation_index integer not null default 1 check (generation_index >= 1),
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists prospect_video_thumbnails_org_generated_idx
  on public.prospect_video_thumbnails (organization_id, generated_at desc);

create index if not exists prospect_video_thumbnails_user_generated_idx
  on public.prospect_video_thumbnails (user_id, generated_at desc);

create index if not exists prospect_video_thumbnails_prospect_generated_idx
  on public.prospect_video_thumbnails (prospect_id, generated_at desc);

create table if not exists public.prospect_video_thumbnail_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organization (id) on delete restrict,
  user_id uuid references auth.users (id) on delete set null,
  usage_date date not null default current_date,
  count integer not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id, usage_date)
);

create index if not exists prospect_video_thumbnail_usage_org_date_idx
  on public.prospect_video_thumbnail_usage (organization_id, usage_date desc);

alter table public.meta_page_cache enable row level security;
alter table public.prospect_ad_intel enable row level security;
alter table public.prospect_video_thumbnails enable row level security;
alter table public.prospect_video_thumbnail_usage enable row level security;

drop policy if exists "agency_staff_meta_page_cache_all" on public.meta_page_cache;
create policy "agency_staff_meta_page_cache_all"
  on public.meta_page_cache for all
  using (public.is_agency_staff())
  with check (public.is_agency_staff());

drop policy if exists "agency_all_prospect_ad_intel" on public.prospect_ad_intel;
create policy "agency_all_prospect_ad_intel"
  on public.prospect_ad_intel for all
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

drop policy if exists "agency_all_prospect_video_thumbnails" on public.prospect_video_thumbnails;
create policy "agency_all_prospect_video_thumbnails"
  on public.prospect_video_thumbnails for all
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

drop policy if exists "agency_all_prospect_video_thumbnail_usage" on public.prospect_video_thumbnail_usage;
create policy "agency_all_prospect_video_thumbnail_usage"
  on public.prospect_video_thumbnail_usage for all
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

grant select, insert, update, delete on public.meta_page_cache to authenticated;
grant select, insert, update, delete on public.prospect_ad_intel to authenticated;
grant select, insert, update, delete on public.prospect_video_thumbnails to authenticated;
grant select, insert, update, delete on public.prospect_video_thumbnail_usage to authenticated;
