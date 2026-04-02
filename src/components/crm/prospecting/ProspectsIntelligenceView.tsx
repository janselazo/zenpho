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
  type IntelSignals,
} from "@/lib/crm/prospect-intel-report";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import { PLACES_TEXT_SEARCH_CATEGORY_SUGGESTIONS } from "@/lib/crm/places-text-search-category-suggestions";
import type { MergedCrmFieldOptions } from "@/lib/crm/field-options";
import {
  researchProspectFromUrl,
  saveProspectIntelReportAction,
  createLeadFromProspectIntelAction,
} from "@/app/(crm)/actions/prospect-intel";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, ChevronLeft, ChevronRight, Globe } from "lucide-react";
import IconTabBar from "@/components/crm/prospecting/IconTabBar";
import PlacesCategoryAutocomplete from "@/components/crm/prospecting/PlacesCategoryAutocomplete";
import PlacesSearchResultsList from "@/components/crm/prospecting/PlacesSearchResultsList";
import ProspectIntelEnrichment, {
  type ProspectWebsiteDeepStatus,
} from "@/components/crm/prospecting/ProspectIntelEnrichment";
import ProspectIntelBusinessSnapshot from "@/components/crm/prospecting/ProspectIntelBusinessSnapshot";
import InstagramLeadFromBioPanel from "@/components/crm/prospecting/InstagramLeadFromBioPanel";
import type { HomepageContactHints } from "@/app/(crm)/actions/prospect-intel";
import { formatReportAsPlainNotes } from "@/lib/crm/prospect-intel-notes-format";

const cardClass =
  "rounded-2xl border border-border bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900/60 dark:shadow-none";

/** Session payload when navigating to the report via ?report=place */
const SESSION_PLACE_REPORT_KEY = "zenpho:prospect-intel-place-v1";
const SESSION_SCROLL_TO_REPORT_KEY = "zenpho:prospect-intel-scroll-v1";

function IntelReportSummary({ report }: { report: MarketIntelReport }) {
  return (
    <div className="h-full rounded-xl border border-border bg-surface/30 p-4 dark:border-zinc-700/80 dark:bg-zinc-900/40 sm:flex sm:min-h-0 sm:flex-col">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/60 dark:text-zinc-500">
        Summary
      </p>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-text-primary dark:text-zinc-100">
        {report.summary}
      </p>
    </div>
  );
}

function ReportSection({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-border/80 pt-6 first:border-t-0 first:pt-0 dark:border-zinc-800">
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

  const shell = embedded
    ? "mt-4 space-y-4 border-t border-border/70 pt-4 dark:border-zinc-700/55"
    : "rounded-xl border border-border/80 bg-white p-4 dark:border-zinc-700/60 dark:bg-zinc-900/40";

  return (
    <div className={shell}>
      {embedded ? (
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/60 dark:text-zinc-500">
          Contacts &amp; hints
        </p>
      ) : null}
      <p className="text-[11px] text-text-secondary dark:text-zinc-500">
        Listing data comes from Google Places where applicable. Email, phone, and name hints below are only
        shown when a public website URL was fetched server-side (HTML parse)—not from Google for owner
        identity.
      </p>

      {reportKind === "place" && place ? (
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
        <div className="mt-4 rounded-lg border border-border/60 bg-surface/20 p-3 dark:border-zinc-700/50 dark:bg-zinc-900/25">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary/70 dark:text-zinc-500">
            Public website (fetched HTML)
          </p>
          <p className="mt-1 break-all font-mono text-[11px] text-text-secondary dark:text-zinc-500">
            {publicSiteTarget}
          </p>
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
              <p className="text-[10px] font-medium uppercase tracking-wide text-text-secondary/60 dark:text-zinc-500">
                First page pass
              </p>
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
              {phonesHomepage.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {phonesHomepage.map((phone) => (
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
              {showHomepagePass ? (
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
                  No emails detected on scanned pages.
                </p>
              ) : null}
              {phonesDisplay.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {phonesDisplay.map((phone) => (
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
            ? "No website on this listing—public-page contact hints are unavailable unless you add a URL and research it."
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

function IntelHighlightsCarousel({ report }: { report: MarketIntelReport }) {
  const [index, setIndex] = useState(0);
  const n = HIGHLIGHT_SLIDES.length;
  const slide = HIGHLIGHT_SLIDES[index];
  const items = report[slide.key];

  return (
    <div className="rounded-xl border border-border/80 p-4 dark:border-zinc-700/60">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/60 dark:text-zinc-500">
          Highlights
        </p>
        <span className="text-[11px] tabular-nums text-text-secondary/70 dark:text-zinc-500">
          {index + 1} / {n}
        </span>
      </div>
      <div className="mt-3 flex items-stretch gap-2">
        <button
          type="button"
          aria-label="Previous highlight"
          onClick={() => setIndex((i) => (i - 1 + n) % n)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-text-secondary hover:bg-surface dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1 rounded-lg border border-border/60 bg-surface/20 p-4 dark:border-zinc-700/50 dark:bg-zinc-900/30">
          <p className={slide.titleClass}>{slide.label}</p>
          <ul className="mt-3 min-h-[16rem] list-inside list-disc space-y-2 overflow-y-auto text-sm text-text-secondary dark:text-zinc-400">
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

function signalsFromPlace(place: PlacesSearchPlace): IntelSignals {
  const uri = place.websiteUri?.trim() || null;
  return {
    name: place.name,
    hasWebsite: Boolean(uri),
    websiteUrl: uri,
    https: uri ? uri.startsWith("https:") : undefined,
    pageTitle: null,
    metaDescription: null,
    rating: place.rating,
    reviewCount: place.userRatingCount,
    placeTypes: place.types,
    formattedAddress: place.formattedAddress,
  };
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
    fieldOptions.leadProjectTypes[0] ?? "Other";
  const [researchTab, setResearchTab] = useState<"discover" | "url">("discover");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [onlyNoWebsite, setOnlyNoWebsite] = useState(false);
  const [places, setPlaces] = useState<PlacesSearchPlace[]>([]);
  const [placesWarning, setPlacesWarning] = useState<string | null>(null);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesFormError, setPlacesFormError] = useState<string | null>(null);
  const [placesSearchMeta, setPlacesSearchMeta] = useState<{
    filteredByNoWebsite: boolean;
    totalBeforeFilter: number;
    droppedCount: number;
  } | null>(null);

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
  const [leadNotes, setLeadNotes] = useState("");
  const [leadPending, setLeadPending] = useState(false);
  const [leadMessage, setLeadMessage] = useState<string | null>(null);

  const [savePending, setSavePending] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [websiteCrawlEmails, setWebsiteCrawlEmails] = useState<string[]>([]);
  const [websiteDeepStatus, setWebsiteDeepStatus] =
    useState<ProspectWebsiteDeepStatus>(INITIAL_WEBSITE_DEEP);

  const activeReport = useMemo(() => {
    if (urlReport && urlMeta) {
      return { report: urlReport, kind: "url" as const, urlMeta };
    }
    if (placeReport) {
      return { report: placeReport.report, kind: "place" as const, place: placeReport.place };
    }
    return null;
  }, [urlReport, urlMeta, placeReport]);

  const syncLeadFormFromPlace = useCallback(
    (place: PlacesSearchPlace, report: MarketIntelReport) => {
      setLeadName(place.name);
      setLeadCompany(place.name);
      const listingPhone =
        place.nationalPhoneNumber?.trim() || place.internationalPhoneNumber?.trim() || "";
      setLeadPhone(listingPhone);
      setLeadEmail("");
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
      const signals = signalsFromPlace(place);
      const report = buildMarketIntelReport(signals);
      setPlaceReport({ place, report });
      setUrlReport(null);
      setUrlMeta(null);
      setUrlHomepageHints(null);
      syncLeadFormFromPlace(place, report);
      setResearchTab("discover");
    },
    [syncLeadFormFromPlace]
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
      const place = JSON.parse(raw) as PlacesSearchPlace;
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
    const cat = category.trim();
    const cityTrim = city.trim();
    const zipTrim = zip.trim();
    if (!cat) {
      setPlacesFormError("Enter a business category.");
      return;
    }
    if (!cityTrim && !zipTrim) {
      setPlacesFormError("Enter a city or ZIP code (or both).");
      return;
    }

    setPlacesLoading(true);
    setPlacesWarning(null);
    setPlaces([]);
    setPlacesSearchMeta(null);
    try {
      const res = await fetch("/api/prospecting/places-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: cat,
          city: cityTrim,
          zip: zipTrim,
          onlyNoWebsite,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPlacesWarning(data.error || "Search failed.");
        return;
      }
      setPlaces(data.places ?? []);
      if (data.warning) setPlacesWarning(data.warning);
      setPlacesSearchMeta({
        filteredByNoWebsite: Boolean(data.filteredByNoWebsite),
        totalBeforeFilter: Number(data.totalBeforeFilter) || 0,
        droppedCount: Number(data.droppedCount) || 0,
      });
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
    } finally {
      setUrlLoading(false);
    }
  }

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
    const res = await createLeadFromProspectIntelAction({
      name: leadName.trim() || "Unknown",
      company: leadCompany.trim() || undefined,
      email: leadEmail.trim() || undefined,
      phone: leadPhone.trim() || undefined,
      website: website || undefined,
      notes: leadNotes.trim(),
      project_type: projectType,
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="heading-display text-2xl font-bold text-text-primary dark:text-zinc-100">
          Prospects
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-text-secondary dark:text-zinc-400">
          Find and qualify outbound targets with Google Places (official API) and quick website
          signals—then turn the best fits into CRM{" "}
          <strong className="font-medium text-text-primary dark:text-zinc-200">Leads</strong>.
          This module is separate from pipeline Leads: use it for market intelligence first.
        </p>
      </div>

      <div className={`${cardClass} space-y-4`}>
        <IconTabBar
          tabs={[
            { id: "discover", label: "Discover businesses", icon: Building2 },
            { id: "url", label: "Research from website URL", icon: Globe },
          ]}
          activeTab={researchTab}
          onTabChange={(id) => setResearchTab(id as "discover" | "url")}
          ariaLabel="Prospects tools"
        />

        <div
          id="discover-panel"
          role="tabpanel"
          aria-labelledby="discover-tab"
          hidden={researchTab !== "discover"}
          className="space-y-4"
        >
          <div>
            <h2 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
              Discover businesses (Google Places)
            </h2>
            <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
              Uses the Places API (Text Search), not HTML scraping. Requires{" "}
              <code className="rounded bg-surface px-1 font-mono text-[11px] dark:bg-zinc-800">
                GOOGLE_PLACES_API_KEY
              </code>{" "}
              on the server. Service-area businesses (e.g. installers, HVAC, mobile trades) are included in
              results. Website status comes from the listing field (sometimes omitted even if a site exists).
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
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
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                City / area
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Orlando FL"
                className="w-full rounded-full border border-border bg-white px-4 py-2.5 text-sm shadow-sm outline-none transition-[box-shadow,border-color] focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                ZIP code
              </label>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="e.g. 32801"
                className="w-full rounded-full border border-border bg-white px-4 py-2.5 text-sm shadow-sm outline-none transition-[box-shadow,border-color] focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-blue-500 dark:focus:ring-blue-500/20"
              />
            </div>
          </div>
          <p className="text-xs text-text-secondary dark:text-zinc-500">
            Enter at least one of city or ZIP (you can use both).
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
          {placesSearchMeta?.filteredByNoWebsite &&
          placesSearchMeta.totalBeforeFilter > 0 &&
          places.length === 0 &&
          !placesWarning ? (
            <p className="text-sm text-amber-800 dark:text-amber-200/90" role="status">
              Google returned {placesSearchMeta.totalBeforeFilter} listing
              {placesSearchMeta.totalBeforeFilter === 1 ? "" : "s"}, but all had a website URL and were hidden.
              Uncheck &quot;Only show listings with no website&quot; above, or try a broader area.
            </p>
          ) : null}
        </div>

        <div
          id="url-panel"
          role="tabpanel"
          aria-labelledby="url-tab"
          hidden={researchTab !== "url"}
          className="space-y-4"
        >
          <div>
            <h2 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
              Research from website URL
            </h2>
            <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
              Two options: (1) Enter a business website URL—we fetch it safely (SSRF-limited), read title and
              meta description, and build a heuristic opportunity report. (2) Use Instagram below with a pasted
              bio to create a lead without calling Instagram.
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

          <InstagramLeadFromBioPanel
            fieldOptions={fieldOptions}
            defaultProjectType={defaultProjectType}
          />
        </div>

        {places.length > 0 ? (
          <div className="space-y-3 border-t border-border pt-4 dark:border-zinc-800">
            {placesSearchMeta?.filteredByNoWebsite &&
            placesSearchMeta.totalBeforeFilter > 0 ? (
              <p className="text-xs text-text-secondary dark:text-zinc-500">
                Showing {places.length} of {placesSearchMeta.totalBeforeFilter} without a
                website ({placesSearchMeta.droppedCount} with a link hidden).
              </p>
            ) : null}
            <PlacesSearchResultsList
              places={places}
              onlyNoWebsite={onlyNoWebsite}
              highlightQuery={category}
              onViewReport={viewPlaceReport}
              totalCount={places.length}
            />
          </div>
        ) : null}
      </div>

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
                Overview starts with business snapshot and contact hints, then summary. After that: lead capture,
                highlights, and enrichment tools. Notes use plain sections (not markdown lists).
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
                    onPickPhone={(phone) => setLeadPhone((cur) => cur.trim() || phone)}
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
                  <p className="mt-4 border-t border-border/50 pt-3 text-[11px] text-text-secondary dark:text-zinc-500">
                    Contact data may be incomplete or outdated. Verify before outreach; comply with applicable
                    laws and vendor terms (Google, Outscraper, Apollo, Hunter).
                  </p>
                </div>
              </div>
              <div className="min-w-0 sm:flex sm:flex-col">
                <IntelReportSummary report={activeReport.report} />
              </div>
            </div>
          </ReportSection>

          <ReportSection step="02" title="Lead & highlights">
            <div className="grid gap-6 sm:grid-cols-2 sm:items-start">
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
              <IntelHighlightsCarousel report={activeReport.report} />
            </div>
          </ReportSection>

          <ReportSection step="03" title="Enrichment tools">
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
                activeReport.kind === "place" ? activeReport.place.googleMapsUri?.trim() || null : null
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
      ) : (
        <div className={`${cardClass} text-sm text-text-secondary dark:text-zinc-500`}>
          Open <strong className="text-text-primary dark:text-zinc-300">Discover businesses</strong>{" "}
          to search Places, or <strong className="text-text-primary dark:text-zinc-300">Research from website URL</strong>{" "}
          for a URL report. Then click <strong className="text-text-primary dark:text-zinc-300">View report</strong> or finish
          URL research to generate a report and add a Lead.
        </div>
      )}
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
