import type {
  StartupSignalAdapterContext,
  StartupSignalAdapterResult,
  StartupSignalSource,
} from "@/lib/crm/startup-signal-types";
import { defaultKeywordsForSources } from "@/lib/crm/startup-signal-keywords";

export const SIGNAL_FETCH_TIMEOUT_MS = 20_000;

export function setupWarning(source: StartupSignalSource, envVars: string, where: string) {
  return {
    ok: false as const,
    warning: `Set ${envVars} in .env.local to enable ${where}.`,
  };
}

export function contextKeywords(
  ctx: StartupSignalAdapterContext,
  source: StartupSignalSource
): string[] {
  const fromFilters = ctx.filters.keywords?.map((k) => k.trim()).filter(Boolean) ?? [];
  if (fromFilters.length) return fromFilters;
  return defaultKeywordsForSources([source]);
}

export function daysForRange(range: StartupSignalAdapterContext["filters"]["timeRange"]): number {
  if (range === "day") return 1;
  if (range === "month") return 30;
  return 7;
}

export function sinceDateIso(ctx: StartupSignalAdapterContext): string {
  const d = new Date(ctx.now);
  d.setUTCDate(d.getUTCDate() - daysForRange(ctx.filters.timeRange));
  return d.toISOString();
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; warning: string }> {
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(SIGNAL_FETCH_TIMEOUT_MS),
    });
    const text = await res.text();
    if (!res.ok) {
      return { ok: false, warning: `HTTP ${res.status}: ${text.slice(0, 240)}` };
    }
    return { ok: true, data: JSON.parse(text) as T };
  } catch (err) {
    return {
      ok: false,
      warning: err instanceof Error ? err.message : "Request failed.",
    };
  }
}

export async function fetchText(
  url: string,
  init?: RequestInit
): Promise<{ ok: true; text: string } | { ok: false; warning: string }> {
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(SIGNAL_FETCH_TIMEOUT_MS),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, warning: `HTTP ${res.status}: ${text.slice(0, 240)}` };
    return { ok: true, text };
  } catch (err) {
    return {
      ok: false,
      warning: err instanceof Error ? err.message : "Request failed.",
    };
  }
}

export function limitAdapterResult(
  result: StartupSignalAdapterResult,
  limit: number
): StartupSignalAdapterResult {
  if (!result.ok) return result;
  return { ...result, hits: result.hits.slice(0, limit) };
}

export function stableId(source: StartupSignalSource, url: string, fallback: string): string {
  return `${source}:${url || fallback}`.toLowerCase().slice(0, 240);
}

export function domainFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

export function pickFirstUrl(text: string): string | null {
  return text.match(/https?:\/\/[^\s<>\]"']+/i)?.[0]?.replace(/[).,;!?]+$/g, "") ?? null;
}
