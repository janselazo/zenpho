-- Ensure lead contact category picklist matches app defaults (idempotent if already applied).
update public.crm_settings
set crm_field_options = jsonb_set(
  coalesce(crm_field_options, '{}'::jsonb),
  '{leadContactCategories}',
  '["Local Business Owner", "Tech Founder", "Ecommerce Founder"]'::jsonb,
  true
)
where id = 1;
