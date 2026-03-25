#!/usr/bin/env node
/**
 * Runs `supabase db push --yes`.
 * If DATABASE_URL is set (env or .env.local / .env), passes --db-url (direct/pooler Postgres).
 * Otherwise uses the linked project (run `npm run supabase:login` then `npm run supabase:link`).
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function loadDatabaseUrlFromEnvFiles() {
  const files = [".env.local", ".env"];
  for (const file of files) {
    const p = join(process.cwd(), file);
    if (!existsSync(p)) continue;
    const lines = readFileSync(p, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const m = trimmed.match(/^DATABASE_URL\s*=\s*(.*)$/);
      if (!m) continue;
      let v = m[1].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (v) return v;
    }
  }
  return "";
}

const fromFile = loadDatabaseUrlFromEnvFiles();
const dbUrl = (process.env.DATABASE_URL || fromFile).trim();

const args = ["supabase", "db", "push", "--yes"];
if (dbUrl) {
  args.push("--db-url", dbUrl);
}

const r = spawnSync("npx", args, {
  stdio: "inherit",
  cwd: process.cwd(),
  env: process.env,
  shell: process.platform === "win32",
});

process.exit(r.status === null ? 1 : r.status);
