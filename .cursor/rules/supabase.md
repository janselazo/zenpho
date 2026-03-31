# Supabase database

**When asked about the database, use the Supabase CLI to inspect the schema or list migrations** (from the project root). Prefer `npx supabase …` or the `supabase` binary from `node_modules` via npm scripts.

Useful commands: `supabase migration list`, `supabase db push --dry-run`, `supabase db pull` / `supabase db dump` when linked, `supabase db query --local` against a local stack.

**This repo’s project:** URL `https://lyvmiueigkksozyvvxpy.supabase.co`, ref `lyvmiueigkksozyvvxpy`.

**One-time link (after `npx supabase login`):** `npx supabase link --project-ref lyvmiueigkksozyvvxpy`. Then `npm run supabase:db:push` applies migrations.

**Cursor MCP:** This repo includes `.cursor/mcp.json` pointing at the hosted Supabase MCP scoped to `lyvmiueigkksozyvvxpy`. Open **Cursor Settings → Tools & MCP**, ensure **supabase-zenpho** is enabled, and complete the **browser login** to Supabase when prompted. For stricter safety, change the URL to add `&read_only=true` (see [Supabase MCP](https://supabase.com/docs/guides/getting-started/mcp)). Local stack: `http://localhost:54321/mcp` when `supabase start` is running.
