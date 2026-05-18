"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Loader2, Play, Search, Sparkles, Video } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { MetaAdIntelResponse, MetaAdSignal } from "@/lib/crm/meta-ad-intel-types";
import MetaAdIntelOutreachTemplates from "@/components/crm/meta-ad-intel/MetaAdIntelOutreachTemplates";

type ThumbnailResult = {
  thumbnailUrl?: string;
  prompt?: string;
  hookText?: string;
  ctaText?: string;
  error?: string;
  missingKey?: boolean;
  generationIndex?: number;
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

function valueOrDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export default function MetaAdIntelModule() {
  const searchParams = useSearchParams();
  const [businessName, setBusinessName] = useState(
    searchParams.get("businessName") ?? searchParams.get("name") ?? "",
  );
  const [websiteUrl, setWebsiteUrl] = useState(searchParams.get("websiteUrl") ?? "");
  const [facebookUrl, setFacebookUrl] = useState(searchParams.get("facebookUrl") ?? "");
  const [googleCategory, setGoogleCategory] = useState(searchParams.get("category") ?? "");
  const [city, setCity] = useState(searchParams.get("city") ?? "");
  const [locale, setLocale] = useState<"en" | "es">("en");
  const [loading, setLoading] = useState(false);
  const [thumbnailLoading, setThumbnailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intel, setIntel] = useState<MetaAdIntelResponse | null>(null);
  const [thumbnail, setThumbnail] = useState<ThumbnailResult | null>(null);

  const canGenerateThumbnail = useMemo(
    () => Boolean(intel && intel.signal !== "COLD"),
    [intel],
  );

  async function runIntel() {
    setLoading(true);
    setError(null);
    setThumbnail(null);
    try {
      const res = await fetch("/api/prospecting/meta-ad-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName,
          websiteUrl,
          facebookUrl,
        }),
      });
      const data = (await res.json()) as MetaAdIntelResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || "Meta Ad Intel request failed.");
      setIntel(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Meta Ad Intel request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function generateThumbnail() {
    if (!intel) return;
    setThumbnailLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/prospecting/video-thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospectAdIntelId: intel.prospectAdIntelId,
          businessName: businessName || "Business",
          googleCategory,
          city,
          sampleAdCreatives: intel.sampleCreatives,
          locale,
          pitchMode: "meta-ads",
        }),
      });
      const data = (await res.json()) as ThumbnailResult;
      if (!res.ok) throw new Error(data.error || "Video thumbnail request failed.");
      setThumbnail(data);
    } catch (err) {
      setThumbnail({
        error: err instanceof Error ? err.message : "Video thumbnail request failed.",
      });
    } finally {
      setThumbnailLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Prospecting
        </p>
        <h1 className="heading-display mt-1 text-2xl font-bold text-text-primary dark:text-zinc-100">
          Meta Ad Intelligence + Video Ads Pitch Generator
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-text-secondary dark:text-zinc-400">
          Detect active Meta ads, Pixel presence, and generate a static video ad thumbnail concept for any business.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900/60">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm font-medium text-text-primary dark:text-zinc-100">
            Business name
            <input
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="Business name"
            />
          </label>
          <label className="text-sm font-medium text-text-primary dark:text-zinc-100">
            Website URL
            <input
              value={websiteUrl}
              onChange={(event) => setWebsiteUrl(event.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="https://example.com"
            />
          </label>
          <label className="text-sm font-medium text-text-primary dark:text-zinc-100">
            Facebook URL / handle
            <input
              value={facebookUrl}
              onChange={(event) => setFacebookUrl(event.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="facebook.com/page"
            />
          </label>
          <label className="text-sm font-medium text-text-primary dark:text-zinc-100">
            Category
            <input
              value={googleCategory}
              onChange={(event) => setGoogleCategory(event.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="Restaurant, marina..."
            />
          </label>
          <label className="text-sm font-medium text-text-primary dark:text-zinc-100">
            City / area
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="Miami"
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void runIntel()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Analyze paid media
          </button>
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </p>
          ) : null}
        </div>
      </section>

      {intel ? (
        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-2xl border border-border bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900/60">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  PAID MEDIA
                </p>
                <h2 className="mt-1 text-xl font-semibold text-text-primary dark:text-zinc-100">
                  Meta ad activity
                </h2>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${signalClass(intel.signal)}`}>
                {SIGNAL_LABELS[intel.signal]}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-surface p-4 dark:bg-zinc-950/50">
                <p className="text-xs text-text-secondary dark:text-zinc-500">Active ads</p>
                <p className="mt-1 text-2xl font-bold text-text-primary dark:text-zinc-100">
                  {intel.adCount}
                </p>
              </div>
              <div className="rounded-xl bg-surface p-4 dark:bg-zinc-950/50">
                <p className="text-xs text-text-secondary dark:text-zinc-500">Oldest active</p>
                <p className="mt-1 text-2xl font-bold text-text-primary dark:text-zinc-100">
                  {intel.oldestAdDaysActive === null ? "-" : `${intel.oldestAdDaysActive}d`}
                </p>
              </div>
              <div className="rounded-xl bg-surface p-4 dark:bg-zinc-950/50">
                <p className="text-xs text-text-secondary dark:text-zinc-500">Platforms</p>
                <p className="mt-1 text-sm font-semibold text-text-primary dark:text-zinc-100">
                  {intel.platforms.length ? intel.platforms.join(", ") : "-"}
                </p>
              </div>
              <div className="rounded-xl bg-surface p-4 dark:bg-zinc-950/50">
                <p className="text-xs text-text-secondary dark:text-zinc-500">Pixel</p>
                <p className="mt-1 text-sm font-semibold text-text-primary dark:text-zinc-100">
                  {intel.pixel.detected ? "Detected" : "Not detected"}
                </p>
              </div>
            </div>

            <p className="mt-5 rounded-xl border border-border bg-white px-4 py-3 text-sm text-text-primary dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-200">
              {intel.outreachAngle}
            </p>

            {intel.pageId ? (
              <a
                href={`https://www.facebook.com/ads/library/?view_all_page_id=${intel.pageId}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline"
              >
                Open Meta Ad Library <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}

            {intel.pixel.pixelIds.length ? (
              <p className="mt-3 text-xs text-text-secondary dark:text-zinc-400">
                Pixel IDs: {intel.pixel.pixelIds.join(", ")}
              </p>
            ) : null}

            {friendlyMetaWarning(intel.warning) ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                {friendlyMetaWarning(intel.warning)}
              </p>
            ) : null}

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {intel.sampleCreatives.length ? (
                intel.sampleCreatives.map((creative) => (
                  <article
                    key={creative.id || `${creative.body}-${creative.startTime}`}
                    className="overflow-hidden rounded-xl border border-border dark:border-zinc-800"
                  >
                    {creative.snapshotUrl ? (
                      <img
                        src={creative.snapshotUrl}
                        alt={creative.linkTitle || "Meta ad creative"}
                        className="h-36 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-36 items-center justify-center bg-surface text-xs text-text-secondary dark:bg-zinc-950">
                        No snapshot
                      </div>
                    )}
                    <div className="p-3">
                      <p className="line-clamp-3 text-xs text-text-primary dark:text-zinc-200">
                        {creative.body || creative.linkTitle || "Meta ad creative"}
                      </p>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border p-5 text-sm text-text-secondary dark:border-zinc-800 dark:text-zinc-500 md:col-span-3">
                  No active creative samples returned.
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Video className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                    VIDEO ADS
                  </p>
                  <h2 className="text-lg font-semibold text-text-primary dark:text-zinc-100">
                    Generate concept
                  </h2>
                </div>
              </div>
              <p className="mt-3 text-sm text-text-secondary dark:text-zinc-400">
                {intel.signal === "COLD"
                  ? "Educate first - they are not running ads yet."
                  : intel.signal === "DORMANT_WITH_PIXEL"
                    ? "Best opportunity: Pixel is installed but ads are dormant."
                    : "Suggested service: short-form video ad creative testing."}
              </p>
              <label className="mt-4 block text-xs font-medium text-text-primary dark:text-zinc-100">
                Hook language
                <select
                  value={locale}
                  onChange={(event) => setLocale(event.target.value === "es" ? "es" : "en")}
                  className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => void generateThumbnail()}
                disabled={!canGenerateThumbnail || thumbnailLoading}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {thumbnailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate concept
              </button>
            </div>

            {thumbnail ? (
              <div className="rounded-2xl border border-border bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900/60">
                {thumbnail.thumbnailUrl ? (
                  <div className="relative overflow-hidden rounded-2xl border border-border bg-zinc-950 dark:border-zinc-800">
                    <img
                      src={thumbnail.thumbnailUrl}
                      alt={thumbnail.hookText || "Generated video ad thumbnail"}
                      className="aspect-[9/16] w-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-zinc-950 shadow-lg">
                        <Play className="h-7 w-7 fill-current" />
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    {thumbnail.error}
                  </p>
                )}
                <dl className="mt-4 space-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-text-secondary dark:text-zinc-500">Hook</dt>
                    <dd className="font-semibold text-text-primary dark:text-zinc-100">
                      {valueOrDash(thumbnail.hookText)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-secondary dark:text-zinc-500">CTA</dt>
                    <dd className="font-semibold text-text-primary dark:text-zinc-100">
                      {valueOrDash(thumbnail.ctaText)}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </aside>
        </section>
      ) : null}

      {intel ? (
        <MetaAdIntelOutreachTemplates
          businessName={businessName || "your business"}
          adCount={intel.adCount}
          hookText={thumbnail?.hookText ?? null}
          ctaText={thumbnail?.ctaText ?? null}
          videoThumbnailUrl={thumbnail?.thumbnailUrl ?? null}
        />
      ) : null}
    </div>
  );
}
