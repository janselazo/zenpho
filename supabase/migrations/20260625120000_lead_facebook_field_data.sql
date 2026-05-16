-- Store the structured Facebook Lead Ads `field_data` array on every imported
-- lead so the notification dispatcher (and the lead detail page later) can
-- access individual question/answer pairs by key. Previously the webhook
-- mapper flattened all custom answers into a `notes` text blob, losing the
-- structure.
--
-- Shape of `lead.facebook_field_data`:
--   [
--     { "name": "full_name",
--       "key":  "full_name",
--       "label": "Full Name",
--       "values": ["Janse Lazo"] },
--     { "name": "tienes_un_carro_para_entregar_como_parte_del_pago",
--       "key":  "tienes_un_carro_para_entregar_como_parte_del_pago",
--       "label": "Tienes un carro para entregar como parte del pago",
--       "values": ["No, sin trade-in"] },
--     ...
--   ]
--
-- `name` is the exact value Meta returned (used for re-parsing). `key` is the
-- normalized snake_case (what the {{lead.answer:key}} token references).
-- `label` is a pretty-printed version for display. `values` is the raw array
-- (most fields are single-value but multi-select questions return arrays).

alter table public.lead
  add column if not exists facebook_field_data jsonb,
  add column if not exists facebook_form_id text,
  add column if not exists facebook_form_name text;

comment on column public.lead.facebook_field_data is
  'Structured snapshot of Meta`s leadgen field_data array. Source of truth for {{lead.answer:key}} token substitution. NULL for non-Facebook leads.';
comment on column public.lead.facebook_form_id is
  'Meta Lead Ad form id this lead was submitted through. Useful for grouping leads by form and resolving the form name from agency_facebook_form_map.';
comment on column public.lead.facebook_form_name is
  'Snapshot of the Lead Ad form name at capture time. NULL for non-Facebook leads or older imports before this column existed.';

-- Index for filtering "show me all leads from form X".
create index if not exists lead_facebook_form_id_idx
  on public.lead (facebook_form_id)
  where facebook_form_id is not null;

-- Cache the Lead Ad form name + question schema on the form-map row so the
-- webhook handler doesn't have to call Graph on every single lead. The
-- "Discover form fields" panel populates this during admin onboarding and
-- the webhook refreshes it lazily when missing.
alter table public.agency_facebook_form_map
  add column if not exists form_name text,
  add column if not exists form_questions jsonb,
  add column if not exists form_synced_at timestamptz;

comment on column public.agency_facebook_form_map.form_name is
  'Display name of the Lead Ad form (cached from Graph). NULL if never synced.';
comment on column public.agency_facebook_form_map.form_questions is
  'Cached JSONB array of question metadata (id, label, key, type) for this form.';
comment on column public.agency_facebook_form_map.form_synced_at is
  'When form_name + form_questions were last refreshed from Graph.';

-- Update default email body so new orgs get a template that showcases the
-- new {{lead.formName}} and {{lead.answers}} tokens. Existing rows are not
-- touched — admins keep whatever template they last saved.
alter table public.lead_automation
  alter column email_html set default
    '<p>You have a new lead from <strong>{{lead.formName}}</strong>.</p>' ||
    '<ul>' ||
      '<li><strong>Name:</strong> {{lead.name}}</li>' ||
      '<li><strong>Email:</strong> {{lead.email}}</li>' ||
      '<li><strong>Phone:</strong> {{lead.phone}}</li>' ||
      '<li><strong>Source:</strong> {{lead.source}}</li>' ||
    '</ul>' ||
    '<p><strong>Form answers:</strong></p>{{lead.answers}}' ||
    '<p><a href="{{lead.url}}">Open in CRM</a></p>';
