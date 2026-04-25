-- Approximate location from last IP geolookup (e.g. Team roster). Updated on CRM session.
alter table public.profiles
  add column if not exists ip_location text;

comment on column public.profiles.ip_location is 'City/region from client IP (login or /api/crm/profile-ip-location); not a physical address.';
