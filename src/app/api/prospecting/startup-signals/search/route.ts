import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  sourcesForChannels,
  SOURCES_BY_CHANNEL,
} from "@/lib/crm/startup-signal-keywords";
import type {
  StartupSignalChannel,
  StartupSignalFilters,
  StartupSignalSource,
} from "@/lib/crm/startup-signal-types";
import {
  ALL_STARTUP_SIGNAL_SOURCES,
  runStartupSignalSources,
} from "@/lib/integrations/startup-signals";
import {
  createSignalMonitorRun,
  persistStartupSignalHits,
} from "@/lib/crm/startup-signal-persistence";

export const runtime = "nodejs";

const CHANNELS = new Set<StartupSignalChannel>([
  "funding",
  "launches",
  "social_intent",
  "linkedin_activity",
]);
const SOURCES = new Set<StartupSignalSource>(ALL_STARTUP_SIGNAL_SOURCES);

function takeStrings(xs: unknown): string[] {
  return Array.isArray(xs)
    ? xs.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
}

function normalizeFilters(body: unknown): StartupSignalFilters {
  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const channels = takeStrings(obj.channels).filter((c): c is StartupSignalChannel =>
    CHANNELS.has(c as StartupSignalChannel)
  );
  const sources = takeStrings(obj.sources).filter((s): s is StartupSignalSource =>
    SOURCES.has(s as StartupSignalSource)
  );
  const timeRange =
    obj.timeRange === "day" || obj.timeRange === "month" || obj.timeRange === "week"
      ? obj.timeRange
      : "week";
  const limit = Math.max(1, Math.min(50, typeof obj.limit === "number" ? obj.limit : 25));
  return {
    channels: channels.length ? channels : undefined,
    sources: sources.length ? sources : undefined,
    keywords: takeStrings(obj.keywords),
    industries: takeStrings(obj.industries),
    locations: takeStrings(obj.locations),
    timeRange,
    limit,
    persist: Boolean(obj.persist),
  };
}

async function requireAgencyStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: "Unauthorized", supabase };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "agency_admin" && profile?.role !== "agency_member") {
    return { ok: false as const, status: 403, error: "Forbidden", supabase };
  }
  return { ok: true as const, supabase };
}

export async function POST(req: Request) {
  const auth = await requireAgencyStaff();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, hits: [], warnings: [] }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", hits: [], warnings: [] }, { status: 400 });
  }

  const filters = normalizeFilters(body);
  const sourceList =
    filters.sources?.length
      ? filters.sources
      : filters.channels?.length
        ? sourcesForChannels(filters.channels)
        : SOURCES_BY_CHANNEL.social_intent;

  const startedAt = new Date().toISOString();
  const result = await runStartupSignalSources(sourceList, {
    now: new Date(),
    filters: {
      ...filters,
      timeRange: filters.timeRange ?? "week",
      limit: filters.limit ?? 25,
    },
  });

  let persistWarning: string | null = null;
  let insertedCount = 0;
  if (filters.persist) {
    const persist = await persistStartupSignalHits(auth.supabase, result.hits);
    persistWarning = persist.warning;
    insertedCount = persist.insertedCount;
    await createSignalMonitorRun(auth.supabase, {
      sourceGroup: "on_demand",
      status: persist.warning ? "failed" : "succeeded",
      filters,
      insertedCount,
      warning: [...result.warnings.map((w) => w.message), persist.warning].filter(Boolean).join("; ") || null,
      startedAt,
    });
  }

  return NextResponse.json({
    hits: result.hits,
    warnings: persistWarning
      ? [...result.warnings, { source: sourceList[0], message: persistWarning }]
      : result.warnings,
    persisted: filters.persist ? { insertedCount } : null,
  });
}
