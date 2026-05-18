"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Megaphone } from "lucide-react";
import type {
  MetaAdIntelResponse,
  MetaAdSignal,
} from "@/lib/crm/meta-ad-intel-types";

type Props = {
  businessName: string;
  websiteUrl: string | null;
  facebookUrl: string | null;
  category: string | null;
  city: string | null;
  /** Lifts pixel detection state to parents that want to surface it elsewhere (e.g. business snapshot). */
  onPixelChange?: (info: { detected: boolean; pixelIds: string[] } | null) => void;
};

const SIGNAL_LABELS: Record<MetaAdSignal, string> = {
  RUNNING_HIGH: "Running high",
  RUNNING_LOW: "Running low",
  DORMANT_WITH_PIXEL: "Dormant with Pixel",
  COLD: "Cold",
  UNKNOWN: "Unknown",
};

function friendlyMetaWarning(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = raw.trim();
  if (!text) return null;
  if (
    /pages_read_engagement|Page Public Content Access|Page Public Metadata Access|Could not resolve a numeric Facebook Page ID|Application does not have permission/i.test(
      text,
    )
  ) {
    return "Meta blocks third-party Page metadata, so this report uses Pixel detection and an Ad Library keyword scan.";
  }
  return text;
}

function signalClass(signal: MetaAdSignal): string {
  switch (signal) {
    case "RUNNING_HIGH":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
    case "RUNNING_LOW":
      return "bg-sky-500/15 text-sky-700 dark:text-sky-300";
    case "DORMANT_WITH_PIXEL":
      return "bg-lime-500/15 text-lime-700 dark:text-lime-300";
    case "COLD":
      return "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300";
    case "UNKNOWN":
    default:
      return "bg-amber-500/15 text-amber-800 dark:text-amber-300";
  }
}

function factValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function buildStandaloneHref(input: Props): string {
  const params = new URLSearchParams();
  if (input.businessName.trim()) params.set("businessName", input.businessName.trim());
  if (input.websiteUrl?.trim()) params.set("websiteUrl", input.websiteUrl.trim());
  if (input.facebookUrl?.trim()) params.set("facebookUrl", input.facebookUrl.trim());
  if (input.category?.trim()) params.set("category", input.category.trim());
  if (input.city?.trim()) params.set("city", input.city.trim());
  const query = params.toString();
  return `/prospecting/meta-ad-intel${query ? `?${query}` : ""}`;
}

export default function MetaAdIntelReportSection({
  businessName,
  websiteUrl,
  facebookUrl,
  category,
  city,
  onPixelChange,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intel, setIntel] = useState<MetaAdIntelResponse | null>(null);

  const requestKey = useMemo(
    () =>
      JSON.stringify({
        businessName: businessName.trim(),
        websiteUrl: websiteUrl?.trim() || "",
        facebookUrl: facebookUrl?.trim() || "",
      }),
    [businessName, facebookUrl, websiteUrl],
  );

  const standaloneHref = useMemo(
    () => buildStandaloneHref({ businessName, websiteUrl, facebookUrl, category, city }),
    [businessName, category, city, facebookUrl, websiteUrl],
  );

  useEffect(() => {
    const name = businessName.trim();
    const website = websiteUrl?.trim() || "";
    const facebook = facebookUrl?.trim() || "";
    if (!name && !website && !facebook) {
      setIntel(null);
      setError(null);
      setLoading(false);
      onPixelChange?.(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetch("/api/prospecting/meta-ad-intel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: name,
        websiteUrl: website || undefined,
        facebookUrl: facebook || undefined,
      }),
    })
      .then(async (res) => {
        const data = (await res.json()) as MetaAdIntelResponse & { error?: string };
        if (!res.ok) throw new Error(data.error || "Meta Ad Intelligence failed.");
        if (!cancelled) {
          setIntel(data);
          onPixelChange?.({
            detected: Boolean(data.pixel?.detected),
            pixelIds: data.pixel?.pixelIds ?? [],
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setIntel(null);
          setError(err instanceof Error ? err.message : "Meta Ad Intelligence failed.");
          onPixelChange?.(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [businessName, facebookUrl, onPixelChange, requestKey, websiteUrl]);

  return (
    <div className="rounded-xl border border-border/80 bg-surface/30 p-4 dark:border-zinc-700/80 dark:bg-zinc-900/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Megaphone className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
              Meta Ad Intelligence
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary dark:text-zinc-500">
              Checks active Meta ad signals and Pixel presence for this prospect.
            </p>
          </div>
        </div>
        <a
          href={standaloneHref}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Open tool
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs text-text-secondary dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Gathering paid media signals…
        </div>
      ) : error ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {error}
        </p>
      ) : intel ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-white px-3 py-2 dark:bg-zinc-950/40">
              <p className="text-[10px] uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                Signal
              </p>
              <span
                className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${signalClass(
                  intel.signal,
                )}`}
              >
                {SIGNAL_LABELS[intel.signal]}
              </span>
            </div>
            <div className="rounded-lg bg-white px-3 py-2 dark:bg-zinc-950/40">
              <p className="text-[10px] uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                Active ads
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary dark:text-zinc-100">
                {intel.adCount}
              </p>
            </div>
            <div className="rounded-lg bg-white px-3 py-2 dark:bg-zinc-950/40">
              <p className="text-[10px] uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                Oldest active
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary dark:text-zinc-100">
                {intel.oldestAdDaysActive === null ? "-" : `${intel.oldestAdDaysActive}d`}
              </p>
            </div>
            <div className="rounded-lg bg-white px-3 py-2 dark:bg-zinc-950/40">
              <p className="text-[10px] uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                Pixel
              </p>
              <p className="mt-1 text-sm font-semibold text-text-primary dark:text-zinc-100">
                {intel.pixel.detected ? "Detected" : "Not detected"}
              </p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-text-primary dark:text-zinc-200">
            {intel.outreachAngle}
          </p>

          <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary dark:text-zinc-400">
            <span>Platforms: {intel.platforms.length ? intel.platforms.join(", ") : "-"}</span>
            <span>Pixel IDs: {intel.pixel.pixelIds.length ? intel.pixel.pixelIds.join(", ") : "-"}</span>
            {intel.pageId ? (
              <a
                href={`https://www.facebook.com/ads/library/?view_all_page_id=${intel.pageId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"
              >
                Ad Library
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            ) : null}
          </div>

          {friendlyMetaWarning(intel.warning) ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              {friendlyMetaWarning(intel.warning)}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-border bg-white px-3 py-2 text-xs text-text-secondary dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
          Add a website or Facebook URL to gather paid media signals. Current website:{" "}
          {factValue(websiteUrl)}.
        </p>
      )}
    </div>
  );
}
