# Supabase database

**When asked about the database, use the Supabase CLI to inspect the schema or list migrations** (from the project root). Prefer `npx supabase …` or the `supabase` binary from `node_modules` via npm scripts.

Useful commands: `supabase migration list`, `supabase db push --dry-run`, `supabase db pull` / `supabase db dump` when linked, `supabase db query --local` against a local stack.

**This repo’s project:** URL `https://lyvmiueigkksozyvvxpy.supabase.co`, ref `lyvmiueigkksozyvvxpy`.

**One-time link (after `npx supabase login`):** `npx supabase link --project-ref lyvmiueigkksozyvvxpy`. Then `npm run supabase:db:push` applies migrations.
