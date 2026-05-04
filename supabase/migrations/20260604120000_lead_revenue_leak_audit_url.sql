-- External link to a revenue leak audit (report, snapshot, or shared doc).

alter table public.lead
  add column if not exists revenue_leak_audit_url text;

comment on column public.lead.revenue_leak_audit_url is
  'Optional URL to a Revenue Leak Audit artifact for this lead (hosted report, PDF link, etc.).';
