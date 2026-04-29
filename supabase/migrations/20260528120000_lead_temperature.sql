-- Lead engagement temperature for pipeline triage (cold / warm / hot).
alter table public.lead
  add column if not exists temperature text;

alter table public.lead
  drop constraint if exists lead_temperature_check;

alter table public.lead
  add constraint lead_temperature_check
    check (
      temperature is null
      or lower(temperature) in ('cold', 'warm', 'hot')
    );

comment on column public.lead.temperature is
  'Subjective lead engagement: cold, warm, or hot (pipeline UI).';
