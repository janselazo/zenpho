-- MOBILE: /preview/{id} serves a phone-sized iframe around stored HTML (?raw=1 = unwrapped).
-- DESKTOP or null: full-bleed HTML (legacy + LLM desktop previews).

alter table public.prospect_preview
  add column if not exists preview_device_type text;

comment on column public.prospect_preview.preview_device_type is
  'MOBILE | DESKTOP | null. MOBILE wraps HTML in a narrow iframe at the public preview URL; Microlink and embeds see the shell. Append ?raw=1 for the raw document.';
