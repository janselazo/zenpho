"use client";

import ContactChannelStrip from "@/components/crm/ContactChannelStrip";
import type { ProspectSocialUrls } from "@/lib/crm/prospect-enrichment-types";

function badge(label: string, cls: string) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}

function listingRatingLine(
  rating: number | null | undefined,
  reviewCount: number | null | undefined
): string | null {
  if (rating != null && reviewCount != null) {
    return `${rating.toFixed(1)} ★ (${reviewCount} reviews)`;
  }
  if (rating != null) {
    return `${rating.toFixed(1)} ★`;
  }
  if (reviewCount != null && reviewCount > 0) {
    return `${reviewCount} reviews`;
  }
  return null;
}

function googleBusinessStatusLabel(status: string): string {
  const map: Record<string, string> = {
    OPERATIONAL: "Active on Google Maps",
    CLOSED_TEMPORARILY: "Temporarily closed",
    CLOSED_PERMANENTLY: "Permanently closed",
    FUTURE_OPENING: "Opening soon",
  };
  return map[status] ?? status.replace(/_/g, " ").toLowerCase();
}

type Props = {
  businessLabel: string;
  addressLabel: string | null;
  listingPhone: string | null;
  googleMapsUri: string | null;
  onPickPhone?: (phone: string) => void;
  /** When true, this row came from URL research—Places phone/Maps are not in scope. */
  researchFromUrl?: boolean;
  /** Shown for URL research (canonical fetched URL). */
  fetchedPageUrl?: string | null;
  /** Google Places listing website (shown in embedded overview next to phone/maps). */
  listingWebsiteUri?: string | null;
  /** Rule-based GTM insight (no separate “Summary” heading). */
  insightSummary?: string | null;
  /** Google Places business lifecycle when available (e.g. OPERATIONAL). */
  googleBusinessStatus?: string | null;
  /** When true, render without outer card chrome (parent provides border). */
  embedded?: boolean;
  /** Best public email from website scan / homepage (mailto + prefills lead form on click). */
  contactEmail?: string | null;
  /** Social profile URLs from crawled site (Google listing rarely exposes these via API). */
  socialUrls?: ProspectSocialUrls | null;
  onPickEmail?: (email: string) => void;
  /** Google Maps rating when the snapshot is backed by a Places listing. */
  listingGoogleRating?: number | null;
  listingGoogleReviewCount?: number | null;
  /** Primary Google categories, e.g. "Banquet Hall · Wedding Venue". */
  listingCategoriesLabel?: string | null;
};

export default function ProspectIntelBusinessSnapshot({
  businessLabel,
  addressLabel,
  listingPhone,
  googleMapsUri,
  onPickPhone,
  researchFromUrl = false,
  fetchedPageUrl,
  listingWebsiteUri = null,
  insightSummary = null,
  googleBusinessStatus = null,
  embedded = false,
  contactEmail = null,
  socialUrls = null,
  onPickEmail,
  listingGoogleRating = null,
  listingGoogleReviewCount = null,
  listingCategoriesLabel = null,
}: Props) {
  const shell = embedded
    ? "min-w-0 sm:flex sm:min-h-0 sm:flex-col"
    : "h-full min-w-0 rounded-xl border border-border bg-surface/30 p-4 dark:border-zinc-700/80 dark:bg-zinc-900/40 sm:flex sm:min-h-0 sm:flex-col";

  const primaryWebsiteUrl =
    (listingWebsiteUri?.trim() && listingWebsiteUri.trim()) ||
    (researchFromUrl && fetchedPageUrl?.trim() ? fetchedPageUrl.trim() : null) ||
    null;

  const ratingDisplay = listingRatingLine(listingGoogleRating, listingGoogleReviewCount);
  const categoriesTrimmed = listingCategoriesLabel?.trim() || null;
  const showListingFacts = Boolean(ratingDisplay || categoriesTrimmed);

  return (
    <div className={shell}>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/60 dark:text-zinc-500">
        Business snapshot
      </p>
      <div className="mt-2 flex min-h-0 flex-1 flex-col">
        <div
          className={`grid min-w-0 gap-4 ${showListingFacts ? "sm:grid-cols-2 sm:items-start" : "grid-cols-1"}`}
        >
          <div className="min-w-0 space-y-2">
            <p className="font-medium text-text-primary dark:text-zinc-100">{businessLabel}</p>
            {addressLabel ? (
              <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">{addressLabel}</p>
            ) : null}
            {!researchFromUrl && googleBusinessStatus?.trim() ? (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {badge(
                  googleBusinessStatus === "OPERATIONAL" ? "Active listing" : "Google status",
                  googleBusinessStatus === "OPERATIONAL"
                    ? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-300"
                    : "bg-amber-500/15 text-amber-950 dark:text-amber-200"
                )}
                <span className="text-text-secondary dark:text-zinc-400">
                  {googleBusinessStatusLabel(googleBusinessStatus)}
                </span>
              </p>
            ) : null}
            {fetchedPageUrl?.trim() ? (
              <p className="mt-2 text-xs text-text-secondary dark:text-zinc-400">
                Fetched page:{" "}
                <a
                  href={fetchedPageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-accent hover:underline dark:text-blue-400"
                >
                  {fetchedPageUrl}
                </a>
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
              {researchFromUrl ? (
                <span className="text-text-secondary dark:text-zinc-500">
                  {badge("URL research", "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300")}
                  Google Places phone and Maps are available when you open a report from{" "}
                  <span className="font-medium text-text-primary dark:text-zinc-200">Local Business</span>.
                </span>
              ) : listingPhone ? (
                <span className="text-text-secondary dark:text-zinc-400">
                  {badge("Google listing", "bg-blue-500/15 text-blue-800 dark:text-blue-300")} Phone:{" "}
                  <button
                    type="button"
                    className="font-mono text-accent hover:underline dark:text-blue-400"
                    onClick={() => onPickPhone?.(listingPhone)}
                  >
                    {listingPhone}
                  </button>
                </span>
              ) : (
                <span className="text-text-secondary dark:text-zinc-500">No phone on Google listing.</span>
              )}
              {!researchFromUrl && googleMapsUri ? (
                <a
                  href={googleMapsUri}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline dark:text-blue-400"
                >
                  Open in Google Maps
                </a>
              ) : null}
            </div>
          </div>
          {showListingFacts ? (
            <dl className="min-w-0 space-y-3 sm:max-w-md sm:justify-self-end sm:text-right">
              {ratingDisplay ? (
                <div>
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-text-secondary/60 dark:text-zinc-500">
                    Google rating
                  </dt>
                  <dd className="mt-0.5 text-xs leading-snug text-text-primary dark:text-zinc-200">
                    {ratingDisplay}
                  </dd>
                </div>
              ) : null}
              {categoriesTrimmed ? (
                <div>
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-text-secondary/60 dark:text-zinc-500">
                    Categories
                  </dt>
                  <dd className="mt-0.5 text-xs leading-snug text-text-primary dark:text-zinc-200">
                    {categoriesTrimmed}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
        <ContactChannelStrip
          websiteUrl={primaryWebsiteUrl}
          contactEmail={contactEmail}
          socialUrls={socialUrls}
          onPickEmail={onPickEmail}
        />
        {insightSummary?.trim() ? (
          <div className="mt-4 border-t border-border/60 pt-4 dark:border-zinc-700/60">
            <p className="text-sm leading-relaxed text-text-primary dark:text-zinc-100">
              {insightSummary.trim()}
            </p>
          </div>
        ) : null}
        {embedded ? null : (
          <p className="mt-auto pt-3 text-[11px] text-text-secondary dark:text-zinc-500">
            Contact data may be incomplete or outdated. Verify before outreach; comply with applicable laws and
            vendor terms (Google, Outscraper, Apollo, Hunter).
          </p>
        )}
      </div>
    </div>
  );
}
