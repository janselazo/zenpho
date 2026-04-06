"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  buildMarketIntelReport,
  type MarketIntelReport,
} from "@/lib/crm/prospect-intel-report";
import { signalsFromPlace } from "@/lib/crm/prospect-intel-place-signals";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import { PLACES_TEXT_SEARCH_CATEGORY_SUGGESTIONS } from "@/lib/crm/places-text-search-category-suggestions";
import type { MergedCrmFieldOptions } from "@/lib/crm/field-options";
import {
  researchProspectFromUrl,
  saveProspectIntelReportAction,
  createLeadFromProspectIntelAction,
  createLeadFromPlacesListingAction,
} from "@/app/(crm)/actions/prospect-intel";
import type { GenerateProspectPreviewPayload } from "@/lib/crm/prospect-preview-run-generate";
import ProspectPreviewOutreachBlock, {
  type ProspectPreviewOutreachSnapshot,
} from "@/components/crm/prospecting/ProspectPreviewOutreachBlock";
import { useRouter, useSearchParams } from "next/navigation";
import { primaryPlaceTypeLabel } from "@/lib/crm/places-search-ui";
import { Building2, ChevronLeft, ChevronRight, Rocket } from "lucide-react";
import ProspectingTabbedShell, {
  PlaceholderPanel,
} from "@/components/crm/prospecting/ProspectingTabbedShell";
import PlacesBusinessAutocomplete from "@/components/crm/prospecting/PlacesBusinessAutocomplete";
import PlacesCategoryAutocomplete from "@/components/crm/prospecting/PlacesCategoryAutocomplete";
import PlacesSearchResultsList from "@/components/crm/prospecting/PlacesSearchResultsList";
import ProspectIntelEnrichment, {
  type ProspectWebsiteDeepStatus,
} from "@/components/crm/prospecting/ProspectIntelEnrichment";
import ProspectIntelBusinessSnapshot from "@/components/crm/prospecting/ProspectIntelBusinessSnapshot";
import type { HomepageContactHints } from "@/app/(crm)/actions/prospect-intel";
import { formatReportAsPlainNotes } from "@/lib/crm/prospect-intel-notes-format";
import { mergeProspectSocialUrls } from "@/lib/crm/prospect-contact-extract";
import { EMPTY_PROSPECT_SOCIAL_URLS } from "@/lib/crm/prospect-enrichment-types";

const cardClass =
  "rounded-2xl border border-border bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900/60 dark:shadow-none";

/** Session payload when navigating to the report via ?report=place */
const SESSION_PLACE_REPORT_KEY = "zenpho:prospect-intel-place-v1";
const SESSION_SCROLL_TO_REPORT_KEY = "zenpho:prospect-intel-scroll-v1";

type IntelGlanceFact = { label: string; value: string };

type IntelHighlightSignalTag = { key: string; label: string; active: boolean };

/** Stars below this count as a weak listing (when Google returns a rating). */
const HIGHLIGHT_LOW_RATING_THRESHOLD = 4;
/** Fewer reviews than this count as low social proof (when Google returns a count). */
const HIGHLIGHT_LOW_REVIEWS_THRESHOLD = 25;

/**
 * Opportunity tags for Google listings. “No claimed profile” uses a thin-profile heuristic:
 * no owner website on the listing and/or no phone on the listing (Places API does not expose GBP verification).
 */
function buildIntelHighlightSignalTags(
  ar:
    | { kind: "url"; urlMeta: { url: string } }
    | { kind: "place"; place: PlacesSearchPlace }
    | null
): IntelHighlightSignalTag[] {
  const labels: { key: string; label: string }[] = [
    { key: "no_website", label: "No Website" },
    { key: "no_claimed_profile", label: "No Claimed Profile" },
    { key: "low_reviews", label: "Low Reviews" },
    { key: "low_rating", label: "Low Rating" },
  ];
  if (!ar || ar.kind !== "place") {
    return labels.map((l) => ({ ...l, active: false }));
  }
  const p = ar.place;
  const noWebsite = !p.websiteUri?.trim();
  const noPhone =
    !p.nationalPhoneNumber?.trim() && !p.internationalPhoneNumber?.trim();
  const noClaimedProfile = noWebsite || noPhone;
  const lowReviews =
    p.userRatingCount != null && p.userRatingCount < HIGHLIGHT_LOW_REVIEWS_THRESHOLD;
  const lowRating =
    p.rating != null && p.rating < HIGHLIGHT_LOW_RATING_THRESHOLD;
  const byKey: Record<string, boolean> = {
    no_website: noWebsite,
    no_claimed_profile: noClaimedProfile,
    low_reviews: lowReviews,
    low_rating: lowRating,
  };
  return labels.map((l) => ({ ...l, active: byKey[l.key] ?? false }));
}

function humanizePlaceType(t: string): string {
  return t
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function primaryPlaceTypes(types: string[]): string {
  const skip = new Set(["point_of_interest", "establishment", "geocode"]);
  const picked = types.filter((t) => !skip.has(t));
  const s = picked.slice(0, 3).map(humanizePlaceType).join(" · ");
  return s || "—";
}

function googleListingStatusGlance(status: string | null | undefined): string | null {
  if (!status?.trim()) return null;
  const map: Record<string, string> = {
    OPERATIONAL: "Active on Google",
    CLOSED_TEMPORARILY: "Temporarily closed",
    CLOSED_PERMANENTLY: "Permanently closed",
    FUTURE_OPENING: "Opening soon",
  };
  return map[status] ?? status.replace(/_/g, " ").toLowerCase();
}

function buildIntelGlanceFacts(
  ar:
    | {
        kind: "url";
        urlMeta: { url: string; pageTitle: string | null; metaDescription: string | null };
      }
    | { kind: "place"; place: PlacesSearchPlace }
): IntelGlanceFact[] {
  if (ar.kind === "place") {
    const p = ar.place;
    const out: IntelGlanceFact[] = [];
    const listingSt = googleListingStatusGlance(p.businessStatus);
    if (listingSt) {
      out.push({ label: "Google listing status", value: listingSt });
    }
    if (p.rating != null && p.userRatingCount != null) {
      out.push({
        label: "Google rating",
        value: `${p.rating.toFixed(1)} ★ (${p.userRatingCount} reviews)`,
      });
    } else if (p.rating != null) {
      out.push({ label: "Google rating", value: `${p.rating.toFixed(1)} ★` });
    } else if (p.userRatingCount != null) {
      out.push({ label: "Reviews", value: String(p.userRatingCount) });
    }
    if (p.types.length > 0) {
      out.push({ label: "Categories", value: primaryPlaceTypes(p.types) });
    }
    const w = p.websiteUri?.trim();
    if (w) {
      try {
        const u = new URL(/^https?:\/\//i.test(w) ? w : `https://${w}`);
        out.push({
          label: "Listing site",
          value: u.protocol === "https:" ? "HTTPS link on listing" : "HTTP link on listing",
        });
      } catch {
        out.push({ label: "Listing site", value: "Link present" });
      }
    } else {
      out.push({ label: "Listing site", value: "Not on Google listing" });
    }
    return out;
  }
  const m = ar.urlMeta;
  const url = m.url;
  let https = false;
  try {
    https = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).protocol === "https:";
  } catch {
    /* ignore */
  }
  const out: IntelGlanceFact[] = [
    { label: "Fetched URL", value: https ? "HTTPS" : "HTTP" },
  ];
  const title = m.pageTitle?.trim();
  if (title) {
    const short = title.length > 72 ? `${title.slice(0, 70)}…` : title;
    out.push({ label: "Page title", value: short });
  }
  const desc = m.metaDescription?.trim();
  if (desc) {
    out.push({
      label: "Meta description",
      value:
        desc.length < 80 ? `${desc.length} chars (thin)` : `${desc.length} chars`,
    });
  } else {
    out.push({ label: "Meta description", value: "Missing" });
  }
  return out;
}

function ReportSection({
  step,
  title,
  children,
  noTopRule = false,
  className = "",
}: {
  step: string;
  title: string;
  children: ReactNode;
  /** When true, skip the default top border/padding (e.g. inside a grouped layout). */
  noTopRule?: boolean;
  className?: string;
}) {
  const rule =
    "border-t border-border/80 pt-6 first:border-t-0 first:pt-0 dark:border-zinc-800";
  return (
    <section
      className={`${noTopRule ? "" : `${rule} `}${className}`.trim()}
    >
      <div className="mb-4 flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-[10px] font-semibold tabular-nums text-text-secondary/80 dark:text-zinc-400">
          {step}
        </span>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-text-secondary dark:text-zinc-300">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

function urlsMatchForDedupe(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = (a ?? "").trim();
  const y = (b ?? "").trim();
  if (!x || !y) return false;
  if (x === y) return true;
  try {
    const ux = new URL(/^https?:\/\//i.test(x) ? x : `https://${x}`);
    const uy = new URL(/^https?:\/\//i.test(y) ? y : `https://${y}`);
    const px = ux.pathname.replace(/\/$/, "") || "/";
    const py = uy.pathname.replace(/\/$/, "") || "/";
    return ux.origin === uy.origin && px === py;
  } catch {
    return false;
  }
}

function digitsCore(s: string): string {
  return s.replace(/\D/g, "");
}

/** True when the two strings are the same phone (last 10 US digits). */
function phonesMatchListing(listing: string | null | undefined, candidate: string): boolean {
  const a = digitsCore(listing ?? "");
  const b = digitsCore(candidate);
  if (a.length < 10 || b.length < 10) return false;
  return a.slice(-10) === b.slice(-10);
}

function WebsiteScanLiveSnapshot({ siteUrl }: { siteUrl: string }) {
  const [failed, setFailed] = useState(false);
  const src = `/api/prospecting/website-snapshot?url=${encodeURIComponent(siteUrl)}`;
  return (
    <div className="mt-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-text-secondary/60 dark:text-zinc-500">
        Live page snapshot
      </p>
      {failed ? (
        <p className="mt-2 text-[11px] text-text-secondary dark:text-zinc-500">
          Preview unavailable (Microlink limits, blocked page, or add MICROLINK_API_KEY for production).
        </p>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- proxied Microlink screenshot
        <img
          src={src}
          alt={`Screenshot of ${siteUrl}`}
          className="mt-2 max-h-44 w-full max-w-md rounded-lg border border-border bg-zinc-100 object-cover object-top dark:border-zinc-700 dark:bg-zinc-900"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

function IntelContactHintsPanel({
  reportKind,
  place,
  fetchedUrl,
  homepageHints,
  websiteDeep,
  websiteCrawlEmails,
  onPickEmail,
  onPickPhone,
  embedded = false,
}: {
  reportKind: "url" | "place";
  place: PlacesSearchPlace | null;
  fetchedUrl: string | null;
  homepageHints: HomepageContactHints | null;
  websiteDeep: ProspectWebsiteDeepStatus;
  websiteCrawlEmails: string[];
  onPickEmail: (email: string) => void;
  onPickPhone: (phone: string) => void;
  /** Nested under Business snapshot (no outer card shell). */
  embedded?: boolean;
}) {
  const listingWebsite =
    reportKind === "place" ? place?.websiteUri?.trim() || null : null;
  const publicSiteTarget =
    reportKind === "url" ? fetchedUrl : listingWebsite;
  const hasPublicFetchTarget = Boolean(publicSiteTarget?.trim());

  const deepEmails = websiteDeep.contacts?.emailsRanked ?? [];
  const emailsDisplay =
    deepEmails.length > 0 ? deepEmails : websiteCrawlEmails;
  const phonesFromDeep = websiteDeep.contacts?.phones ?? [];
  const founderDeep = websiteDeep.contacts?.founderName?.trim() || null;
  const founderHomepage = homepageHints?.founderName?.trim() || null;
  const phonesHomepage = homepageHints?.phones ?? [];
  const emailsHomepage = homepageHints?.emails ?? [];

  const founderDisplay = founderDeep || founderHomepage;
  const phonesDisplay =
    phonesFromDeep.length > 0 ? phonesFromDeep : phonesHomepage;
  const showHomepagePass =
    reportKind === "url" &&
    (emailsHomepage.length > 0 || phonesHomepage.length > 0 || founderHomepage);

  const hasWebsiteDerivedContent =
    Boolean(founderDisplay) ||
    emailsDisplay.length > 0 ||
    phonesDisplay.length > 0 ||
    showHomepagePass;

  const hidePlacesListingBlock = embedded && reportKind === "place" && place;
  const duplicateListingUrl =
    Boolean(listingWebsite?.trim()) &&
    Boolean(publicSiteTarget?.trim()) &&
    urlsMatchForDedupe(listingWebsite, publicSiteTarget);

  const listingPhoneRaw =
    reportKind === "place"
      ? place?.nationalPhoneNumber?.trim() || place?.internationalPhoneNumber?.trim() || null
      : null;

  const extraPhones = (phones: string[]) =>
    embedded && listingPhoneRaw
      ? phones.filter((p) => !phonesMatchListing(listingPhoneRaw, p))
      : phones;

  const phonesHomepageExtra = extraPhones(phonesHomepage);
  const phonesDisplayExtra = extraPhones(phonesDisplay);

  const shell = embedded
    ? "mt-4 space-y-3 border-t border-border/70 pt-4 dark:border-zinc-700/55"
    : "rounded-xl border border-border/80 bg-white p-4 dark:border-zinc-700/60 dark:bg-zinc-900/40";

  return (
    <div className={shell}>
      {embedded ? (
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/60 dark:text-zinc-500">
          Website scan
        </p>
      ) : null}
      {!embedded ? (
        <p className="text-[11px] text-text-secondary dark:text-zinc-500">
          Listing data comes from Google Places where applicable. Email, phone, and name hints below are only
          shown when a public website URL was fetched server-side (HTML parse)—not from Google for owner
          identity.
        </p>
      ) : null}

      {reportKind === "place" && place && !hidePlacesListingBlock ? (
        <div className="mt-4 rounded-lg border border-border/60 bg-surface/30 p-3 dark:border-zinc-700/50 dark:bg-zinc-900/30">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary/70 dark:text-zinc-500">
            Google listing (Places API)
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-text-primary dark:text-zinc-200">
            <li>
              <span className="text-text-secondary dark:text-zinc-500">Phone: </span>
              {place.nationalPhoneNumber?.trim() ||
              place.internationalPhoneNumber?.trim() ? (
                <button
                  type="button"
                  className="font-mono text-accent hover:underline dark:text-blue-400"
                  onClick={() =>
                    onPickPhone(
                      place.nationalPhoneNumber?.trim() ||
                        place.internationalPhoneNumber?.trim() ||
                        ""
                    )
                  }
                >
                  {place.nationalPhoneNumber?.trim() ||
                    place.internationalPhoneNumber?.trim()}
                </button>
              ) : (
                <span className="text-text-secondary dark:text-zinc-500">Not provided</span>
              )}
            </li>
            <li>
              <span className="text-text-secondary dark:text-zinc-500">Google Maps: </span>
              {place.googleMapsUri?.trim() ? (
                <a
                  href={place.googleMapsUri.trim()}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline dark:text-blue-400"
                >
                  Open link
                </a>
              ) : (
                <span className="text-text-secondary dark:text-zinc-500">Not provided</span>
              )}
            </li>
            <li>
              <span className="text-text-secondary dark:text-zinc-500">Website on listing: </span>
              {listingWebsite ? (
                <a
                  href={listingWebsite}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-accent hover:underline dark:text-blue-400"
                >
                  {listingWebsite}
                </a>
              ) : (
                <span className="text-text-secondary dark:text-zinc-500">None</span>
              )}
            </li>
          </ul>
        </div>
      ) : null}

      {hasPublicFetchTarget ? (
        <div
          className={
            hidePlacesListingBlock
              ? "mt-0 rounded-lg border border-border/60 bg-surface/20 p-3 dark:border-zinc-700/50 dark:bg-zinc-900/25"
              : "mt-4 rounded-lg border border-border/60 bg-surface/20 p-3 dark:border-zinc-700/50 dark:bg-zinc-900/25"
          }
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary/70 dark:text-zinc-500">
            {embedded ? "HTML parse" : "Public website (fetched HTML)"}
          </p>
          {!(embedded && duplicateListingUrl) ? (
            <p className="mt-1 break-all font-mono text-[11px] text-text-secondary dark:text-zinc-500">
              {publicSiteTarget}
            </p>
          ) : null}
          {publicSiteTarget?.trim() ? (
            <WebsiteScanLiveSnapshot siteUrl={publicSiteTarget.trim()} />
          ) : null}
          {websiteDeep.loading ? (
            <p className="mt-2 text-xs text-text-secondary dark:text-zinc-500">Scanning site…</p>
          ) : null}
          {websiteDeep.error ? (
            <p className="mt-2 text-xs text-amber-800 dark:text-amber-200/90" role="alert">
              {websiteDeep.error}
            </p>
          ) : null}

          {showHomepagePass ? (
            <div className="mt-3 border-t border-border/50 pt-3 dark:border-zinc-700/50">
              {!embedded ? (
                <p className="text-[10px] font-medium uppercase tracking-wide text-text-secondary/60 dark:text-zinc-500">
                  First page pass
                </p>
              ) : null}
              {founderHomepage ? (
                <p className="mt-1 text-sm text-text-primary dark:text-zinc-100">
                  Name hint:{" "}
                  <span className="font-medium">{founderHomepage}</span>
                </p>
              ) : null}
              {emailsHomepage.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {emailsHomepage.map((email) => (
                    <li key={email}>
                      <button
                        type="button"
                        className="text-accent hover:underline dark:text-blue-400"
                        onClick={() => onPickEmail(email)}
                      >
                        {email}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {phonesHomepageExtra.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {phonesHomepageExtra.map((phone) => (
                    <li key={phone}>
                      <button
                        type="button"
                        className="font-mono text-accent hover:underline dark:text-blue-400"
                        onClick={() => onPickPhone(phone)}
                      >
                        {phone}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {(hasWebsiteDerivedContent && !showHomepagePass) ||
          (hasWebsiteDerivedContent && showHomepagePass && (emailsDisplay.length > 0 || phonesDisplay.length > 0 || founderDeep)) ? (
            <div
              className={
                showHomepagePass
                  ? "mt-3 border-t border-border/50 pt-3 dark:border-zinc-700/50"
                  : "mt-2"
              }
            >
              {showHomepagePass && !embedded ? (
                <p className="text-[10px] font-medium uppercase tracking-wide text-text-secondary/60 dark:text-zinc-500">
                  Multi-page merge
                </p>
              ) : null}
              {founderDeep ? (
                <p className="mt-1 text-sm text-text-primary dark:text-zinc-100">
                  Name hint (crawl): <span className="font-medium">{founderDeep}</span>
                </p>
              ) : null}
              {emailsDisplay.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {emailsDisplay.map((email) => (
                    <li key={email}>
                      <button
                        type="button"
                        className="text-accent hover:underline dark:text-blue-400"
                        onClick={() => onPickEmail(email)}
                      >
                        {email}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : !websiteDeep.loading && !websiteDeep.error ? (
                <p className="mt-2 text-xs text-text-secondary dark:text-zinc-500">
                  {embedded ? "No emails in HTML scan." : "No emails detected on scanned pages."}
                </p>
              ) : null}
              {phonesDisplayExtra.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {phonesDisplayExtra.map((phone) => (
                    <li key={phone}>
                      <button
                        type="button"
                        className="font-mono text-accent hover:underline dark:text-blue-400"
                        onClick={() => onPickPhone(phone)}
                      >
                        {phone}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : !websiteDeep.loading && !websiteDeep.error && reportKind === "url" ? (
            <p className="mt-2 text-xs text-text-secondary dark:text-zinc-500">
              No contact hints extracted from the homepage HTML.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-xs text-text-secondary dark:text-zinc-500">
          {reportKind === "place"
            ? embedded
              ? "No website on this listing—HTML scan unavailable."
              : "No website on this listing—public-page contact hints are unavailable unless you add a URL and research it."
            : null}
        </p>
      )}
    </div>
  );
}

const HIGHLIGHT_SLIDES: {
  label: string;
  titleClass: string;
  key: keyof Pick<MarketIntelReport, "software" | "aiAutomations" | "productGrowth">;
}[] = [
  {
    key: "software",
    label: "Software development",
    titleClass:
      "text-[11px] font-semibold uppercase tracking-widest text-blue-600/80 dark:text-blue-400",
  },
  {
    key: "aiAutomations",
    label: "AI automations",
    titleClass:
      "text-[11px] font-semibold uppercase tracking-widest text-violet-600/80 dark:text-violet-400",
  },
  {
    key: "productGrowth",
    label: "Product growth",
    titleClass:
      "text-[11px] font-semibold uppercase tracking-widest text-emerald-600/80 dark:text-emerald-400",
  },
];

function IntelHighlightsCarousel({
  report,
  glanceFacts,
  signalTags,
}: {
  report: MarketIntelReport;
  glanceFacts: IntelGlanceFact[];
  signalTags: IntelHighlightSignalTag[];
}) {
  const [index, setIndex] = useState(0);
  const n = HIGHLIGHT_SLIDES.length;
  const slide = HIGHLIGHT_SLIDES[index];
  const items = report[slide.key];

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-border/80 p-4 dark:border-zinc-700/60">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/60 dark:text-zinc-500">
          Highlights
        </p>
        <span className="text-[11px] tabular-nums text-text-secondary/70 dark:text-zinc-500">
          {index + 1} / {n}
        </span>
      </div>
      <div className="mt-3 rounded-lg border border-border/50 bg-surface/25 p-3 dark:border-zinc-700/40 dark:bg-zinc-900/35">
        {glanceFacts.length > 0 ? (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary/55 dark:text-zinc-500">
              Signals at a glance
            </p>
            <dl className="mt-2 grid gap-2 sm:grid-cols-2">
              {glanceFacts.map((f) => (
                <div key={f.label} className="min-w-0">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-text-secondary/60 dark:text-zinc-500">
                    {f.label}
                  </dt>
                  <dd className="mt-0.5 text-xs leading-snug text-text-primary dark:text-zinc-200">
                    {f.value}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        ) : null}
        <div
          className={`flex flex-wrap gap-1.5 ${glanceFacts.length > 0 ? "mt-3 border-t border-border/40 pt-3 dark:border-zinc-700/40" : ""}`}
          role="list"
          aria-label="Listing signal tags"
        >
          {signalTags.map((t) => (
            <span
              key={t.key}
              role="listitem"
              className={
                t.active
                  ? "rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-100"
                  : "rounded-full border border-border/50 bg-white/60 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary/35 dark:border-zinc-700/50 dark:bg-zinc-950/20 dark:text-zinc-600"
              }
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 flex min-h-0 flex-1 items-stretch gap-2">
        <button
          type="button"
          aria-label="Previous highlight"
          onClick={() => setIndex((i) => (i - 1 + n) % n)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-text-secondary hover:bg-surface dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border border-border/60 bg-surface/20 p-4 dark:border-zinc-700/50 dark:bg-zinc-900/30">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            <p className={slide.titleClass}>{slide.label}</p>
            <span className="text-[10px] tabular-nums text-text-secondary/55 dark:text-zinc-500">
              {items.length} idea{items.length === 1 ? "" : "s"}
            </span>
          </div>
          <ul className="mt-3 min-h-[12rem] flex-1 list-inside list-disc space-y-2 overflow-y-auto text-sm text-text-secondary dark:text-zinc-400">
            {items.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          aria-label="Next highlight"
          onClick={() => setIndex((i) => (i + 1) % n)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-text-secondary hover:bg-surface dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

const INITIAL_WEBSITE_DEEP: ProspectWebsiteDeepStatus = {
  loading: false,
  contacts: null,
  error: null,
};

function ProspectsIntelligenceViewInner({
  fieldOptions,
}: {
  fieldOptions: MergedCrmFieldOptions;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prevReportSearchParam = useRef<string | null>(null);
  const defaultProjectType =
    fieldOptions.leadProjectTypes[0] ?? "MVP Dev";
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [onlyNoWebsite, setOnlyNoWebsite] = useState(false);
  const [places, setPlaces] = useState<PlacesSearchPlace[]>([]);
  const [placesWarning, setPlacesWarning] = useState<string | null>(null);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesFormError, setPlacesFormError] = useState<string | null>(null);
  const [quickPlacesLeadMessage, setQuickPlacesLeadMessage] = useState<string | null>(null);

  /** Checkbox filters client-side so toggling works without re-running Text Search. */
  const placesDisplayed = useMemo(
    () =>
      onlyNoWebsite ? places.filter((p) => !p.websiteUri?.trim()) : places,
    [places, onlyNoWebsite]
  );

  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlReport, setUrlReport] = useState<MarketIntelReport | null>(null);
  const [urlMeta, setUrlMeta] = useState<{
    url: string;
    pageTitle: string | null;
    metaDescription: string | null;
  } | null>(null);
  const [urlHomepageHints, setUrlHomepageHints] = useState<HomepageContactHints | null>(null);

  const [placeReport, setPlaceReport] = useState<{
    place: PlacesSearchPlace;
    report: MarketIntelReport;
  } | null>(null);

  const [projectType, setProjectType] = useState<string>(defaultProjectType);

  useEffect(() => {
    setProjectType((cur) =>
      fieldOptions.leadProjectTypes.includes(cur) ? cur : defaultProjectType
    );
  }, [fieldOptions.leadProjectTypes, defaultProjectType]);
  const [leadName, setLeadName] = useState("");
  const [leadCompany, setLeadCompany] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadFacebook, setLeadFacebook] = useState("");
  const [leadInstagram, setLeadInstagram] = useState("");
  const [leadGoogleBusinessCategory, setLeadGoogleBusinessCategory] = useState("");
  const [leadGooglePlaceTypesJson, setLeadGooglePlaceTypesJson] = useState("[]");
  const [leadNotes, setLeadNotes] = useState("");
  const [leadPending, setLeadPending] = useState(false);
  const [leadMessage, setLeadMessage] = useState<string | null>(null);

  const [savePending, setSavePending] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [websiteCrawlEmails, setWebsiteCrawlEmails] = useState<string[]>([]);
  const [websiteDeepStatus, setWebsiteDeepStatus] =
    useState<ProspectWebsiteDeepStatus>(INITIAL_WEBSITE_DEEP);

  const [previewMap, setPreviewMap] = useState<
    Record<string, ProspectPreviewOutreachSnapshot>
  >({});
  const [previewGenLoadingKey, setPreviewGenLoadingKey] = useState<string | null>(
    null,
  );
  const [previewGenError, setPreviewGenError] = useState<string | null>(null);

  const activeReport = useMemo(() => {
    if (urlReport && urlMeta) {
      return { report: urlReport, kind: "url" as const, urlMeta };
    }
    if (placeReport) {
      return { report: placeReport.report, kind: "place" as const, place: placeReport.place };
    }
    return null;
  }, [urlReport, urlMeta, placeReport]);

  const outreachPreviewKey = useMemo(() => {
    if (!activeReport) return "";
    return activeReport.kind === "place"
      ? `place:${activeReport.place.id}`
      : `url:${activeReport.urlMeta.url}`;
  }, [activeReport]);

  useEffect(() => {
    setPreviewGenError(null);
  }, [outreachPreviewKey]);

  const smsOutreachPrefill = useMemo(() => {
    const lead = leadPhone.trim();
    if (activeReport?.kind === "place") {
      const listing =
        activeReport.place.nationalPhoneNumber?.trim() ||
        activeReport.place.internationalPhoneNumber?.trim() ||
        "";
      return lead || listing;
    }
    return lead;
  }, [activeReport, leadPhone]);

  const handleGeneratePreviewForKey = useCallback(
    async (key: string, payload: GenerateProspectPreviewPayload) => {
      setPreviewGenLoadingKey(key);
      setPreviewGenError(null);
      try {
        const res = await fetch("/api/prospecting/generate-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        });
        const r = (await res.json().catch(() => null)) as
          | {
              ok: true;
              previewId: string;
              previewUrl: string;
              businessName: string;
              screenshotStatus: string;
              screenshotUrl: string | null;
            }
          | { ok: false; error: string }
          | null;
        if (!r || typeof r !== "object" || !("ok" in r)) {
          setPreviewGenError(
            res.ok
              ? "Invalid response from preview API."
              : `Preview request failed (${res.status}).`,
          );
          return;
        }
        if (!r.ok) {
          setPreviewGenError(r.error);
          return;
        }
        setPreviewMap((m) => ({
          ...m,
          [key]: {
            previewId: r.previewId,
            previewUrl: r.previewUrl,
            businessName: r.businessName,
            screenshotStatus: r.screenshotStatus,
            screenshotUrl: r.screenshotUrl,
          },
        }));
      } catch (e) {
        const raw =
          e instanceof Error
            ? e.message
            : "Preview generation failed. Check the browser console and server logs.";
        const msg =
          raw.includes("Server Components render") || raw.includes("digest")
            ? "Preview request failed on the server (production hides details). Confirm ANTHROPIC_API_KEY and OPENAI_API_KEY on Vercel for Production (redeploy after changes), prospect_preview migration applied, and function duration: Hobby’s short timeout often causes this—check deployment logs for the digest or upgrade/lengthen maxDuration."
            : raw;
        setPreviewGenError(msg);
      } finally {
        setPreviewGenLoadingKey(null);
      }
    },
    [],
  );

  const handleGenerateActiveReportPreview = useCallback(
    async (opts?: { colorVibe?: string; servicesLine?: string }) => {
      if (!activeReport || !outreachPreviewKey) {
        setPreviewGenError(
          "No report is active. Open a Places listing or research a URL first, then try again.",
        );
        return;
      }
      const payload =
        activeReport.kind === "place"
          ? ({
              kind: "place" as const,
              place: activeReport.place,
              ...opts,
            } as const)
          : ({
              kind: "url" as const,
              url: activeReport.urlMeta.url,
              pageTitle: activeReport.urlMeta.pageTitle,
              ...opts,
            } as const);
      await handleGeneratePreviewForKey(outreachPreviewKey, payload);
    },
    [activeReport, outreachPreviewKey, handleGeneratePreviewForKey],
  );

  const handleGeneratePreviewFromPlacesRow = useCallback(
    (place: PlacesSearchPlace) => {
      const key = `place:${place.id}`;
      void handleGeneratePreviewForKey(key, { kind: "place", place });
    },
    [handleGeneratePreviewForKey],
  );

  const intelGlanceFacts = useMemo(
    () => (activeReport ? buildIntelGlanceFacts(activeReport) : []),
    [activeReport]
  );

  const intelHighlightSignalTags = useMemo(
    () =>
      buildIntelHighlightSignalTags(
        activeReport
          ? activeReport.kind === "place"
            ? { kind: "place", place: activeReport.place }
            : { kind: "url", urlMeta: { url: activeReport.urlMeta.url } }
          : null
      ),
    [activeReport]
  );

  const snapshotSocialUrls = useMemo(() => {
    const deep = websiteDeepStatus.contacts?.socialUrls;
    if (activeReport?.kind === "url" && urlHomepageHints) {
      return mergeProspectSocialUrls(
        urlHomepageHints.socialUrls,
        deep ?? EMPTY_PROSPECT_SOCIAL_URLS
      );
    }
    return deep ?? EMPTY_PROSPECT_SOCIAL_URLS;
  }, [activeReport?.kind, urlHomepageHints, websiteDeepStatus.contacts?.socialUrls]);

  const snapshotContactEmail = useMemo(() => {
    const ranked = websiteDeepStatus.contacts?.emailsRanked;
    if (ranked && ranked.length > 0) return ranked[0] ?? null;
    if (websiteCrawlEmails.length > 0) return websiteCrawlEmails[0] ?? null;
    if (activeReport?.kind === "url" && urlHomepageHints?.emails?.length)
      return urlHomepageHints.emails[0] ?? null;
    return null;
  }, [
    activeReport?.kind,
    urlHomepageHints?.emails,
    websiteCrawlEmails,
    websiteDeepStatus.contacts?.emailsRanked,
  ]);

  useEffect(() => {
    const s = websiteDeepStatus.contacts?.socialUrls;
    if (!s) return;
    if (s.facebook)
      setLeadFacebook((cur) => (cur.trim() ? cur : s.facebook ?? ""));
    if (s.instagram)
      setLeadInstagram((cur) => (cur.trim() ? cur : s.instagram ?? ""));
  }, [websiteDeepStatus.contacts?.socialUrls]);

  const syncLeadFormFromPlace = useCallback(
    (place: PlacesSearchPlace, report: MarketIntelReport) => {
      setLeadName(place.name);
      setLeadCompany(place.name);
      const listingPhone =
        place.nationalPhoneNumber?.trim() || place.internationalPhoneNumber?.trim() || "";
      setLeadPhone(listingPhone);
      setLeadEmail("");
      setLeadFacebook("");
      setLeadInstagram("");
      setLeadGoogleBusinessCategory(primaryPlaceTypeLabel(place.types));
      setLeadGooglePlaceTypesJson(JSON.stringify(place.types ?? []));
      const extra = [place.formattedAddress, place.websiteUri].filter(Boolean).join("\n");
      const contactLines: string[] = [];
      if (listingPhone) contactLines.push(`Google listing phone: ${listingPhone}`);
      const maps = place.googleMapsUri?.trim();
      if (maps) contactLines.push(`Google Maps: ${maps}`);
      setLeadNotes(
        formatReportAsPlainNotes(report, extra || undefined, contactLines.join("\n") || undefined)
      );
    },
    []
  );

  const applyPlaceReport = useCallback(
    (place: PlacesSearchPlace) => {
      const normalized: PlacesSearchPlace = {
        ...place,
        businessStatus: place.businessStatus ?? null,
      };
      const signals = signalsFromPlace(normalized);
      const report = buildMarketIntelReport(signals);
      setPlaceReport({ place: normalized, report });
      setUrlReport(null);
      setUrlMeta(null);
      setUrlHomepageHints(null);
      syncLeadFormFromPlace(normalized, report);
    },
    [syncLeadFormFromPlace]
  );

  const onPlacesAutocompleteResolved = useCallback(
    (place: PlacesSearchPlace) => {
      applyPlaceReport(place);
      setPlaces([place]);
      setPlacesFormError(null);
      setPlacesWarning(null);
      queueMicrotask(() => {
        requestAnimationFrame(() => {
          document
            .getElementById("prospect-market-intel-report")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
    },
    [applyPlaceReport]
  );

  useEffect(() => {
    const cur = searchParams.get("report");
    if (prevReportSearchParam.current === "place" && cur !== "place") {
      sessionStorage.removeItem(SESSION_PLACE_REPORT_KEY);
    }
    prevReportSearchParam.current = cur;
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("report") !== "place") return;
    if (typeof window === "undefined") return;

    const raw = sessionStorage.getItem(SESSION_PLACE_REPORT_KEY);
    if (!raw) {
      router.replace("/prospecting/prospects", { scroll: false });
      return;
    }

    try {
      const parsed = JSON.parse(raw) as PlacesSearchPlace;
      const place: PlacesSearchPlace = {
        ...parsed,
        businessStatus: parsed.businessStatus ?? null,
      };
      if (!place?.id || !place?.name) {
        sessionStorage.removeItem(SESSION_PLACE_REPORT_KEY);
        router.replace("/prospecting/prospects", { scroll: false });
        return;
      }
      try {
        sessionStorage.setItem(SESSION_SCROLL_TO_REPORT_KEY, "1");
      } catch {
        /* private mode */
      }
      applyPlaceReport(place);
    } catch {
      sessionStorage.removeItem(SESSION_PLACE_REPORT_KEY);
      router.replace("/prospecting/prospects", { scroll: false });
      return;
    }

    router.replace("/prospecting/prospects", { scroll: false });
  }, [searchParams, router, applyPlaceReport]);

  useEffect(() => {
    if (!activeReport) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_SCROLL_TO_REPORT_KEY) !== "1") return;
    sessionStorage.removeItem(SESSION_SCROLL_TO_REPORT_KEY);
    requestAnimationFrame(() => {
      document
        .getElementById("prospect-market-intel-report")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [activeReport]);

  useEffect(() => {
    if (!activeReport) {
      setWebsiteCrawlEmails([]);
      setWebsiteDeepStatus(INITIAL_WEBSITE_DEEP);
    }
  }, [activeReport]);

  async function runPlacesSearch() {
    setPlacesFormError(null);
    const nameTrim = businessName.trim();
    const cat = category.trim();
    const cityTrim = city.trim();
    if (!cat && !nameTrim) {
      setPlacesFormError("Enter a business category and/or business name.");
      return;
    }

    setPlacesLoading(true);
    setPlacesWarning(null);
    setQuickPlacesLeadMessage(null);
    setPlaces([]);
    try {
      const res = await fetch("/api/prospecting/places-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: nameTrim || undefined,
          category: cat,
          city: cityTrim || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPlacesWarning(data.error || "Search failed.");
        return;
      }
      setPlaces(data.places ?? []);
      if (data.warning) setPlacesWarning(data.warning);
    } catch {
      setPlacesWarning("Network error.");
    } finally {
      setPlacesLoading(false);
    }
  }

  async function runUrlResearch() {
    setUrlLoading(true);
    setUrlError(null);
    setUrlReport(null);
    setUrlMeta(null);
    setUrlHomepageHints(null);
    setPlaceReport(null);
    try {
      const result = await researchProspectFromUrl(urlInput);
      if (!result.ok) {
        setUrlError(result.error);
        return;
      }
      setUrlReport(result.report);
      setUrlMeta({
        url: result.url,
        pageTitle: result.pageTitle,
        metaDescription: result.metaDescription,
      });
      setUrlHomepageHints(result.homepageContactHints);
      const domain = (() => {
        try {
          return new URL(result.url).hostname.replace(/^www\./, "");
        } catch {
          return "";
        }
      })();
      setLeadName(result.pageTitle?.slice(0, 120) || domain);
      setLeadCompany(domain);
      const h = result.homepageContactHints;
      const contactLines: string[] = [];
      if (h.founderName) contactLines.push(`Name hint (homepage): ${h.founderName}`);
      if (h.emails.length) contactLines.push(`Emails (homepage): ${h.emails.join(", ")}`);
      if (h.phones.length) contactLines.push(`Phones (homepage): ${h.phones.join(", ")}`);
      setLeadNotes(
        formatReportAsPlainNotes(
          result.report,
          result.url,
          contactLines.join("\n") || undefined
        )
      );
      setLeadEmail(h.emails[0] ?? "");
      setLeadPhone(h.phones[0] ?? "");
      setLeadFacebook(h.socialUrls.facebook ?? "");
      setLeadInstagram(h.socialUrls.instagram ?? "");
      setLeadGoogleBusinessCategory("");
      setLeadGooglePlaceTypesJson("[]");
    } finally {
      setUrlLoading(false);
    }
  }

  const handleQuickCreateFromPlace = useCallback(
    async (place: PlacesSearchPlace) => {
      setQuickPlacesLeadMessage(null);
      const res = await createLeadFromPlacesListingAction(place, projectType);
      if ("error" in res && res.error) {
        setQuickPlacesLeadMessage(res.error);
        return;
      }
      setQuickPlacesLeadMessage("Lead created with Prospect tag. You can find it under Leads.");
      router.refresh();
    },
    [projectType, router]
  );

  const viewPlaceReport = useCallback(
    (place: PlacesSearchPlace) => {
      try {
        sessionStorage.setItem(SESSION_PLACE_REPORT_KEY, JSON.stringify(place));
        sessionStorage.setItem(SESSION_SCROLL_TO_REPORT_KEY, "1");
      } catch {
        applyPlaceReport(place);
        queueMicrotask(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              document
                .getElementById("prospect-market-intel-report")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
          });
        });
        return;
      }
      router.push("/prospecting/prospects?report=place");
    },
    [router, applyPlaceReport]
  );

  async function submitLead() {
    setLeadPending(true);
    setLeadMessage(null);
    const website =
      activeReport?.kind === "url"
        ? activeReport.urlMeta.url
        : activeReport?.kind === "place"
          ? activeReport.place.websiteUri || ""
          : "";
    let googlePlaceTypes: string[] | undefined;
    try {
      const parsed = JSON.parse(leadGooglePlaceTypesJson) as unknown;
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string") && parsed.length) {
        googlePlaceTypes = parsed as string[];
      }
    } catch {
      googlePlaceTypes = undefined;
    }
    const res = await createLeadFromProspectIntelAction({
      name: leadName.trim() || "Unknown",
      company: leadCompany.trim() || undefined,
      email: leadEmail.trim() || undefined,
      phone: leadPhone.trim() || undefined,
      website: website || undefined,
      facebook: leadFacebook.trim() || undefined,
      instagram: leadInstagram.trim() || undefined,
      notes: leadNotes.trim(),
      project_type: projectType,
      google_business_category: leadGoogleBusinessCategory.trim() || undefined,
      google_place_types: googlePlaceTypes,
    });
    setLeadPending(false);
    if ("error" in res && res.error) {
      setLeadMessage(res.error);
      return;
    }
    setLeadMessage("Lead created. You can find it under Leads.");
    router.refresh();
  }

  async function saveReport() {
    if (!activeReport) return;
    setSavePending(true);
    setSaveMessage(null);
    const payload =
      activeReport.kind === "url"
        ? {
            source: "url",
            url: activeReport.urlMeta.url,
            title: activeReport.urlMeta.pageTitle,
            report: activeReport.report,
          }
        : {
            source: "places",
            placeId: activeReport.place.id,
            place: activeReport.place,
            report: activeReport.report,
          };
    const res = await saveProspectIntelReportAction(payload);
    setSavePending(false);
    if ("error" in res && res.error) {
      setSaveMessage(res.error);
      return;
    }
    setSaveMessage("Report saved.");
  }

  const prospectsDescription =
    "Find and qualify outbound targets with Google Places (official API) and quick website signals—then turn the best fits into CRM Leads. This module is separate from pipeline Leads: use it for market intelligence first.";

  const localBusinessTabBody = (
    <div className={`${cardClass} space-y-4`}>
      <div id="local-business-panel" className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
            Local Business
          </h2>
            <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
              Business names use Google Places Autocomplete; bulk discovery still uses Text Search. Requires{" "}
              <code className="rounded bg-surface px-1 font-mono text-[11px] dark:bg-zinc-800">
                GOOGLE_PLACES_API_KEY
              </code>{" "}
              on the server. Pick a suggestion to open the report. Service-area businesses are included.
              Website on the listing is sometimes omitted even if a site exists.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                Business name
              </label>
              <PlacesBusinessAutocomplete
                value={businessName}
                onChange={setBusinessName}
                cityHint={city}
                disabled={placesLoading}
                onPlaceResolved={onPlacesAutocompleteResolved}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                Business category
              </label>
              <PlacesCategoryAutocomplete
                value={category}
                onChange={setCategory}
                suggestions={PLACES_TEXT_SEARCH_CATEGORY_SUGGESTIONS}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                City / area <span className="font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Narrows Text Search and business autocomplete (e.g. Orlando FL)"
                className="w-full rounded-full border border-border bg-white px-4 py-2.5 text-sm shadow-sm outline-none transition-[box-shadow,border-color] focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
              />
            </div>
          </div>
          <p className="text-xs text-text-secondary dark:text-zinc-500">
            Type a business name and choose a Google suggestion to jump straight to the report, or enter a
            category (and optional name / city) and run Text Search for a list.
          </p>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-text-primary dark:text-zinc-200">
            <input
              type="checkbox"
              checked={onlyNoWebsite}
              onChange={(e) => setOnlyNoWebsite(e.target.checked)}
              className="mt-0.5 rounded border-border"
            />
            <span>
              Only show listings with no website URL — most contractors and installers have a site, so this
              often hides every result. Uncheck to see them.
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={placesLoading}
              onClick={() => void runPlacesSearch()}
              className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover disabled:opacity-50"
            >
              {placesLoading ? "Searching…" : "Search"}
            </button>
          </div>
          {placesFormError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{placesFormError}</p>
          ) : null}
          {placesWarning ? (
            <p className="text-sm text-amber-800 dark:text-amber-200">{placesWarning}</p>
          ) : null}
          {places.length > 0 &&
          placesDisplayed.length === 0 &&
          onlyNoWebsite &&
          !placesWarning ? (
            <p className="text-sm text-amber-800 dark:text-amber-200/90" role="status">
              All {places.length} listing{places.length === 1 ? "" : "s"} include a website URL on Google, so
              nothing matches this filter. Uncheck &quot;Only show listings with no website&quot; to see them,
              or try a broader search.
            </p>
          ) : null}
        </div>

        {places.length > 0 ? (
          <div className="space-y-3 border-t border-border pt-4 dark:border-zinc-800">
            {onlyNoWebsite && placesDisplayed.length > 0 && places.length > placesDisplayed.length ? (
              <p className="text-xs text-text-secondary dark:text-zinc-500">
                Showing {placesDisplayed.length} of {places.length} without a website URL on the listing (
                {places.length - placesDisplayed.length} with a site hidden).
              </p>
            ) : null}
            {quickPlacesLeadMessage ? (
              <p
                className={`text-sm ${
                  quickPlacesLeadMessage.startsWith("Lead created")
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
                role="status"
              >
                {quickPlacesLeadMessage}
              </p>
            ) : null}
            {placesDisplayed.length > 0 ? (
              <PlacesSearchResultsList
                places={placesDisplayed}
                onlyNoWebsite={onlyNoWebsite}
                searchResultCount={places.length}
                highlightQuery={[businessName, category].filter(Boolean).join(" ").trim()}
                onViewReport={viewPlaceReport}
                projectType={projectType}
                onQuickCreateLead={handleQuickCreateFromPlace}
                onGeneratePreview={handleGeneratePreviewFromPlacesRow}
                generatingPreviewPlaceId={previewGenLoadingKey?.startsWith("place:") ? previewGenLoadingKey.slice(6) : null}
              />
            ) : null}
            {previewGenError ? (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {previewGenError}
              </p>
            ) : null}
          </div>
        ) : null}

        <div
          id="url-research-panel"
          className="space-y-4 border-t border-border pt-6 dark:border-zinc-800"
        >
          <div>
            <h2 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
              Research from website URL
            </h2>
            <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
              Enter a business website URL—we fetch it safely (SSRF-limited), read title and meta description,
              and build a heuristic opportunity report.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com"
              className="min-w-[16rem] flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              type="button"
              disabled={urlLoading || !urlInput.trim()}
              onClick={() => void runUrlResearch()}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {urlLoading ? "Researching…" : "Research URL"}
            </button>
          </div>
          {urlError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{urlError}</p>
          ) : null}
        </div>

        {!activeReport ? (
          <div className="border-t border-border pt-4 text-sm text-text-secondary dark:border-zinc-800 dark:text-zinc-500">
            Use <strong className="text-text-primary dark:text-zinc-300">Local Business</strong> (pick a
            suggestion or run Text Search and open{" "}
            <strong className="text-text-primary dark:text-zinc-300">View report</strong>
            ), or <strong className="text-text-primary dark:text-zinc-300">Research from website URL</strong>{" "}
            above, to generate a report and add a Lead.
          </div>
        ) : null}
      </div>
  );

  return (
    <div className="space-y-8">
      <ProspectingTabbedShell
        title="Prospects"
        description={prospectsDescription}
        ariaLabel="Prospects"
        tabs={[
          {
            id: "tech-startups",
            label: "Tech Startups",
            icon: Rocket,
            body: <PlaceholderPanel text="Coming soon." />,
          },
          {
            id: "local-business",
            label: "Local Business",
            icon: Building2,
            body: localBusinessTabBody,
          },
        ]}
      />

      {activeReport ? (
        <div
          id="prospect-market-intel-report"
          className={`${cardClass} scroll-mt-6 space-y-0`}
          tabIndex={-1}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
                Market intelligence report
              </h2>
              <p className="mt-1 max-w-2xl text-[11px] text-text-secondary dark:text-zinc-500">
                Overview: business snapshot with GTM insight and website scan; highlights use live signals plus
                software / AI / growth angles. Then add a lead and run enrichment tools. Notes use plain sections
                (not markdown lists).
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={savePending}
                onClick={() => void saveReport()}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface dark:border-zinc-600 dark:hover:bg-zinc-800"
              >
                {savePending ? "Saving…" : "Save report"}
              </button>
            </div>
          </div>

          {saveMessage ? (
            <p className="mt-3 text-xs text-text-secondary dark:text-zinc-400">{saveMessage}</p>
          ) : null}

          <ReportSection step="01" title="Overview">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-stretch sm:gap-6">
              <div className="min-w-0 sm:flex sm:flex-col">
                <div className="flex h-full min-w-0 flex-col rounded-xl border border-border bg-surface/30 p-4 dark:border-zinc-700/80 dark:bg-zinc-900/40 sm:min-h-0">
                  <ProspectIntelBusinessSnapshot
                    embedded
                    insightSummary={activeReport.report.summary}
                    googleBusinessStatus={
                      activeReport.kind === "place"
                        ? activeReport.place.businessStatus?.trim() || null
                        : null
                    }
                    listingWebsiteUri={
                      activeReport.kind === "place"
                        ? activeReport.place.websiteUri?.trim() || null
                        : null
                    }
                    businessLabel={
                      activeReport.kind === "url"
                        ? activeReport.urlMeta.pageTitle?.slice(0, 200) || activeReport.urlMeta.url
                        : activeReport.place.name
                    }
                    addressLabel={
                      activeReport.kind === "place" ? activeReport.place.formattedAddress : null
                    }
                    listingPhone={
                      activeReport.kind === "place"
                        ? activeReport.place.nationalPhoneNumber?.trim() ||
                          activeReport.place.internationalPhoneNumber?.trim() ||
                          null
                        : null
                    }
                    googleMapsUri={
                      activeReport.kind === "place"
                        ? activeReport.place.googleMapsUri?.trim() || null
                        : null
                    }
                    researchFromUrl={activeReport.kind === "url"}
                    fetchedPageUrl={
                      activeReport.kind === "url" ? activeReport.urlMeta.url : null
                    }
                    contactEmail={snapshotContactEmail}
                    socialUrls={snapshotSocialUrls}
                    onPickPhone={(phone) => setLeadPhone((cur) => cur.trim() || phone)}
                    onPickEmail={(email) => setLeadEmail((cur) => cur.trim() || email)}
                  />
                  <IntelContactHintsPanel
                    embedded
                    reportKind={activeReport.kind}
                    place={activeReport.kind === "place" ? activeReport.place : null}
                    fetchedUrl={activeReport.kind === "url" ? activeReport.urlMeta.url : null}
                    homepageHints={activeReport.kind === "url" ? urlHomepageHints : null}
                    websiteDeep={websiteDeepStatus}
                    websiteCrawlEmails={websiteCrawlEmails}
                    onPickEmail={(email) => setLeadEmail((cur) => cur.trim() || email)}
                    onPickPhone={(phone) => setLeadPhone((cur) => cur.trim() || phone)}
                  />
                </div>
              </div>
              <div className="min-w-0 sm:flex sm:flex-col">
                <IntelHighlightsCarousel
                  report={activeReport.report}
                  glanceFacts={intelGlanceFacts}
                  signalTags={intelHighlightSignalTags}
                />
              </div>
            </div>
            <div className="mt-6">
              <ProspectPreviewOutreachBlock
                canGenerate={Boolean(activeReport)}
                onGenerate={handleGenerateActiveReportPreview}
                generatePending={
                  Boolean(outreachPreviewKey) && previewGenLoadingKey === outreachPreviewKey
                }
                generateError={previewGenError}
                preview={
                  outreachPreviewKey ? previewMap[outreachPreviewKey] ?? null : null
                }
                smsDefaultTo={smsOutreachPrefill}
                emailDefaultTo={leadEmail.trim()}
                facebookUrl={
                  snapshotSocialUrls.facebook?.trim() ||
                  leadFacebook.trim() ||
                  null
                }
                instagramUrl={
                  snapshotSocialUrls.instagram?.trim() ||
                  leadInstagram.trim() ||
                  null
                }
              />
            </div>
          </ReportSection>

          <div className="border-t border-border/80 pt-6 dark:border-zinc-800">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
              <ReportSection step="02" title="Lead" noTopRule className="min-w-0">
            <div className="min-w-0">
              <div className="rounded-xl border border-border/80 p-4 dark:border-zinc-700/60">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-text-secondary/70 dark:text-zinc-500">
                  Add as Lead
                </h3>
              <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
                Project type is required for CRM Leads. Prefilled from research—you can edit
                before saving.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Name
                  </label>
                  <input
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Company
                  </label>
                  <input
                    value={leadCompany}
                    onChange={(e) => setLeadCompany(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Google business category (from listing)
                  </label>
                  <input
                    value={leadGoogleBusinessCategory}
                    onChange={(e) => setLeadGoogleBusinessCategory(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    placeholder="e.g. Beauty Salon"
                  />
                  <p className="mt-1 text-[10px] text-text-secondary dark:text-zinc-500">
                    Filled from Google Places types for local listings; editable before create. Separate from
                    CRM contact category.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Email (optional)
                  </label>
                  <input
                    type="email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Facebook (optional)
                  </label>
                  <input
                    type="url"
                    inputMode="url"
                    placeholder="https://facebook.com/…"
                    value={leadFacebook}
                    onChange={(e) => setLeadFacebook(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Instagram (optional)
                  </label>
                  <input
                    type="url"
                    inputMode="url"
                    placeholder="https://instagram.com/…"
                    value={leadInstagram}
                    onChange={(e) => setLeadInstagram(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Project type
                  </label>
                  <select
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    {fieldOptions.leadProjectTypes.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Notes (plain structured text)
                  </label>
                  <p className="mb-1 text-[11px] text-text-secondary dark:text-zinc-500">
                    Prefilled with labeled sections and • bullets—not markdown.
                  </p>
                  <textarea
                    value={leadNotes}
                    onChange={(e) => setLeadNotes(e.target.value)}
                    rows={10}
                    className="min-h-[14rem] w-full rounded-lg border border-border px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={leadPending || !leadName.trim()}
                onClick={() => void submitLead()}
                className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {leadPending ? "Creating…" : "Create Lead"}
              </button>
              {leadMessage ? (
                <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">
                  {leadMessage}
                </p>
              ) : null}
            </div>
            </div>
          </ReportSection>

              <ReportSection
                step="03"
                title="Enrichment tools"
                noTopRule
                className="min-w-0 border-t border-border/80 pt-8 dark:border-zinc-800 lg:border-t-0 lg:pt-0"
              >
                <ProspectIntelEnrichment
                  omitBusinessSnapshot
                  websiteUrl={
                    activeReport.kind === "url"
                      ? activeReport.urlMeta.url
                      : activeReport.place.websiteUri?.trim() || null
                  }
                  listingPhone={
                    activeReport.kind === "place"
                      ? activeReport.place.nationalPhoneNumber?.trim() ||
                        activeReport.place.internationalPhoneNumber?.trim() ||
                        null
                      : null
                  }
                  googleMapsUri={
                    activeReport.kind === "place"
                      ? activeReport.place.googleMapsUri?.trim() || null
                      : null
                  }
                  businessLabel={
                    activeReport.kind === "url"
                      ? activeReport.urlMeta.pageTitle?.slice(0, 200) || activeReport.urlMeta.url
                      : activeReport.place.name
                  }
                  addressLabel={
                    activeReport.kind === "place" ? activeReport.place.formattedAddress : null
                  }
                  homepageContactHints={activeReport.kind === "url" ? urlHomepageHints : null}
                  onPickEmail={(email) => setLeadEmail((cur) => cur.trim() || email)}
                  onPickPhone={(phone) => setLeadPhone((cur) => cur.trim() || phone)}
                  onWebsiteEmailsChange={setWebsiteCrawlEmails}
                  onWebsiteDeepStatusChange={setWebsiteDeepStatus}
                />
              </ReportSection>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ProspectsIntelligenceView({
  fieldOptions,
}: {
  fieldOptions: MergedCrmFieldOptions;
}) {
  return (
    <Suspense
      fallback={
        <div className={`${cardClass} animate-pulse text-sm text-text-secondary dark:text-zinc-500`}>
          Loading prospects…
        </div>
      }
    >
      <ProspectsIntelligenceViewInner fieldOptions={fieldOptions} />
    </Suspense>
  );
}
