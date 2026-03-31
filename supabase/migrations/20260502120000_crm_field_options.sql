-- Configurable picklists + product plan display labels (singleton row id = 1).
-- Empty JSON keys mean "use app defaults" (see mergeFieldOptionsFromDb).

alter table public.crm_settings
  add column if not exists crm_field_options jsonb not null default '{}'::jsonb;
