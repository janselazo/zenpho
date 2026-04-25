import { NextResponse } from "next/server";
import {
  sourcesForChannels,
  SOURCES_BY_CHANNEL,
} from "@/lib/crm/startup-signal-keywords";
import type {
  StartupSignalChannel,
  StartupSignalFilters,
  StartupSignalSource,
} from "@/lib/crm/startup-signal-types";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createSignalMonitorRun,
  persistStartupSignalHits,
} from "@/lib/crm/startup-signal-persistence";
import { runStartupSignalSources } from "@/lib/integrations/startup-signals";

export const runtime = "nodejs";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

function parseCsv<T extends string>(value: string | null): T[] {
  return value?.split(",").map((s) => s.trim()).filter(Boolean) as T[] ?? [];
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  let body: Partial<StartupSignalFilters> = {};
  try {
    body = (await req.json()) as Partial<StartupSignalFilters>;
  } catch {
    body = {};
  }

  const channels =
    body.channels ??
    parseCsv<StartupSignalChannel>(process.env.STARTUP_SIGNAL_CRON_CHANNELS ?? null);
  const sources =
    body.sources ??
    parseCsv<StartupSignalSource>(process.env.STARTUP_SIGNAL_CRON_SOURCES ?? null);
  const filters: StartupSignalFilters = {
    ...body,
    channels: channels.length ? channels : ["funding", "launches", "social_intent"],
    sources:
      sources.length > 0
        ? sources
        : channels.length > 0
          ? sourcesForChannels(channels)
          : [
              ...SOURCES_BY_CHANNEL.funding,
              ...SOURCES_BY_CHANNEL.launches,
              ...SOURCES_BY_CHANNEL.social_intent,
            ],
    timeRange: body.timeRange ?? "week",
    limit: Math.max(1, Math.min(50, body.limit ?? 25)),
    persist: true,
  };

  const supabase = createAdminClient();
  try {
    const result = await runStartupSignalSources(filters.sources ?? [], {
      now: new Date(),
      filters: {
        ...filters,
        timeRange: filters.timeRange ?? "week",
        limit: filters.limit ?? 25,
      },
    });
    const persist = await persistStartupSignalHits(supabase, result.hits);
    await createSignalMonitorRun(supabase, {
      sourceGroup: "scheduled",
      status: persist.warning ? "failed" : "succeeded",
      filters,
      insertedCount: persist.insertedCount,
      warning:
        [...result.warnings.map((w) => w.message), persist.warning]
          .filter(Boolean)
          .join("; ") || null,
      startedAt,
    });
    return NextResponse.json({
      ok: !persist.warning,
      hits: result.hits.length,
      warnings: result.warnings,
      persisted: persist,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Startup signal cron failed.";
    await createSignalMonitorRun(supabase, {
      sourceGroup: "scheduled",
      status: "failed",
      filters,
      insertedCount: 0,
      error: message,
      startedAt,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
