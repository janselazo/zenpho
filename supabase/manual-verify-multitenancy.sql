-- Manual checks after applying 20260610120000_organization_multitenancy.sql
-- Run in Supabase Dashboard → SQL Editor (read-only SELECTs).

-- 1) Helper exists
select proname, prosecdef as security_definer
from pg_proc
where proname = 'current_organization_id';

-- 2) Lead policy references org isolation (qual should mention current_organization_id)
select policyname, cmd, qual::text as using_expr, with_check::text
from pg_policies
where schemaname = 'public'
  and tablename = 'lead'
order by policyname;

-- 3) Profiles carry organization (spot-check: multiple orgs after new signups)
select organization_id, count(*) as profile_count
from public.profiles
group by organization_id
order by profile_count desc
limit 20;

-- 4) Legacy org id matches src/lib/organization.ts LEGACY_ORGANIZATION_ID
select id, name from public.organization where id = '00000000-0000-0000-0000-000000000001'::uuid;
