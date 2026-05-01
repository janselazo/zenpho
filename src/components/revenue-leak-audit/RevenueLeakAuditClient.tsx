"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronDown,
  Download,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
  Target,
  XCircle,
} from "lucide-react";
import ContactChannelStrip from "@/components/crm/ContactChannelStrip";
import RevenueLeakFixLeaksCta from "@/components/revenue-leak-audit/RevenueLeakFixLeaksCta";
import RevenueLeakSnapshot, { RevenueLeakTopLeaksSection } from "@/components/revenue-leak-audit/RevenueLeakSnapshot";
import Button from "@/components/ui/Button";
import { EMPTY_PROSPECT_SOCIAL_URLS } from "@/lib/crm/prospect-enrichment-types";
import { getGoogleBusinessProfileChecklistIssues } from "@/lib/revenue-leak-audit/gbp-checklist";
import {
  applyAssumptionsToFindings,
  COMPETITOR_MAP_LOCAL_RADIUS_MILES,
} from "@/lib/revenue-leak-audit/revenue-leak-scoring-service";
import type {
  AuditGrade,
  BusinessProfile,
  BusinessSearchResult,
  CompetitorMapPoint,
  RevenueLeakAudit,
  SectionProblemSummary,
} from "@/lib/revenue-leak-audit/types";
import {
  buildLastReviewsSentimentBlock,
} from "@/lib/revenue-leak-audit/review-sentiment-service";
import {
  formatReviewStarLabel,
} from "@/lib/revenue-leak-audit/review-selection";
import {
  buildCategoryMarkerElement,
  CLASSIC_MARKER_PIN_LAYOUT,
  compositeCategoryMarkerDataUrl,
  resolveCategoryMarkerStyle,
} from "@/lib/revenue-leak-audit/map-marker-style";

const inputClass =
  "w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-primary placeholder:text-text-secondary/45 outline-none shadow-sm transition-all focus:border-accent focus:ring-2 focus:ring-accent/15";

const progressSteps = [
  "Analyzing Google Business Profile",
  "Finding Google competitors",
  "Analyzing reviews",
  "Checking website",
  "Analyzing photos",
  "Estimating revenue leaks",
  "Preparing interactive report",
];

/** Do not auto-advance past this index while waiting on `/analyze` (canceled at ANALYSIS_COUNTDOWN_SECONDS). */
const PROGRESS_AUTOSTEP_CAP = Math.max(0, progressSteps.length - 2);

/** Ring + countdown use this duration; progress caps at 92% until the API returns. */
const ANALYSIS_COUNTDOWN_SECONDS = 60;
const ESTIMATED_ANALYSIS_MS = ANALYSIS_COUNTDOWN_SECONDS * 1_000;
/** Collapsed "Things to Improve" rows before "+ N more". */
const THINGS_TO_IMPROVE_INITIAL = 6;
/** Do not show a full ring until the server responds. */
const ANALYSIS_RING_INDETERMINATE_CAP = 0.92;

type Stage = "search" | "analyzing" | "report";

type SearchResponse = {
  ok: boolean;
  businesses?: BusinessSearchResult[];
  error?: string;
  warnings?: string[];
};

type DetailsResponse = {
  ok: boolean;
  business?: BusinessProfile | null;
  error?: string;
  warnings?: string[];
};

type AnalyzeResponse = {
  ok: boolean;
  audit?: RevenueLeakAudit | null;
  error?: string;
  warnings?: string[];
};

function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString()}`;
}

/** User-facing timestamp for when this audit snapshot was generated. */
function formatAuditLastUpdated(iso: string | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function gradeClasses(grade: AuditGrade): string {
  switch (grade) {
    case "Poor":
      return "border-red-200 bg-red-50 text-red-700";
    case "Average":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "Good":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "Excellent":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

function actionPlanImpactTagClasses(impact: "High" | "Medium" | "Low"): string {
  switch (impact) {
    case "High":
      return "border border-red-200/90 bg-red-50 text-red-800";
    case "Medium":
      return "border border-amber-200/90 bg-amber-50 text-amber-900";
    case "Low":
      return "border border-slate-200/90 bg-slate-50 text-slate-700";
  }
}

function actionPlanDifficultyTagClasses(difficulty: "Low" | "Medium" | "High"): string {
  switch (difficulty) {
    case "High":
      return "border border-red-200/90 bg-red-50 text-red-800";
    case "Medium":
      return "border border-amber-200/90 bg-amber-50 text-amber-900";
    case "Low":
      return "border border-emerald-200/90 bg-emerald-50 text-emerald-900";
  }
}

function scoreColor(score: number): string {
  if (score < 50) return "#dc2626";
  if (score < 70) return "#f59e0b";
  if (score < 85) return "#2563eb";
  return "#059669";
}

function ScoreGauge({ score, grade, size = 148 }: { score: number; grade: AuditGrade; size?: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  const compact = size < 110;
  return (
    <div className="inline-flex flex-col items-center justify-center">
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#e8ecf1"
            strokeWidth={compact ? "11" : "13"}
          />
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={scoreColor(score)}
            strokeLinecap="round"
            strokeWidth={compact ? "11" : "13"}
            strokeDasharray={`${dash} ${circumference}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`font-black leading-none tracking-tight text-text-primary ${
              compact ? "text-xl" : "text-4xl"
            }`}
          >
            {score}
          </span>
        </div>
      </div>
      <span
        className={`mt-1 rounded-full border font-bold leading-none ${
          compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1 text-xs"
        } ${gradeClasses(grade)}`}
      >
        {grade}
      </span>
    </div>
  );
}

function AuditPdfIconButton({ audit }: { audit: RevenueLeakAudit }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch("/api/revenue-leak-audit/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audit }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Could not generate PDF.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${audit.business.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-revenue-leak-audit.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate PDF.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="relative flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={download}
        disabled={downloading}
        title="Download PDF report"
        aria-label="Download PDF report"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/80 text-accent transition hover:border-accent/50 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-55 dark:border-zinc-600 dark:hover:border-blue-500/40 dark:hover:bg-zinc-800/80"
      >
        {downloading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Download className="h-4 w-4" aria-hidden />
        )}
      </button>
      <span className="max-w-[4.5rem] truncate text-center text-[9px] font-medium uppercase tracking-wide text-text-secondary/70 dark:text-zinc-500">
        PDF
      </span>
      {error ? (
        <p
          className="absolute left-1/2 top-full z-10 mt-1 w-40 -translate-x-1/2 rounded-lg border border-red-100 bg-white p-2 text-center text-[11px] font-semibold leading-snug text-red-600 shadow-sm"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function googleBusinessProfilePhotoUrl(business: BusinessProfile): string | null {
  const photoName = business.photos.find((photo) => photo.name)?.name;
  return photoName
    ? `/api/revenue-leak-audit/place-photo?name=${encodeURIComponent(photoName)}`
    : null;
}

function HeroSearch({
  onSearch,
  onSelectBusiness,
  searching,
}: {
  onSearch: (businessName: string) => void | Promise<void>;
  onSelectBusiness: (result: BusinessSearchResult) => void | Promise<void>;
  searching: boolean;
}) {
  const [businessName, setBusinessName] = useState("");
  const [suggestions, setSuggestions] = useState<BusinessSearchResult[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const autocompleteSeqRef = useRef(0);

  useEffect(() => {
    const q = businessName.trim();
    const seq = ++autocompleteSeqRef.current;
    setHint(null);
    if (q.length < 2) {
      setSuggestions([]);
      setSuggesting(false);
      return;
    }
    setSuggesting(true);
    const id = window.setTimeout(() => {
      void fetch("/api/revenue-leak-audit/business-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: q }),
      })
        .then(async (res) => {
          const data = (await res.json()) as SearchResponse;
          if (!res.ok || !data.ok) {
            throw new Error(data.error ?? "Could not load business matches.");
          }
          if (seq !== autocompleteSeqRef.current) return;
          setSuggestions(data.businesses ?? []);
          setHint(data.warnings?.[0] ?? null);
          setOpen(true);
        })
        .catch((e) => {
          if (seq !== autocompleteSeqRef.current) return;
          setSuggestions([]);
          setHint(e instanceof Error ? e.message : "Could not load business matches.");
        })
        .finally(() => {
          if (seq === autocompleteSeqRef.current) setSuggesting(false);
        });
    }, 300);
    return () => window.clearTimeout(id);
  }, [businessName]);

  return (
    <section className="hero-sky px-4 pb-16 pt-32 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent/15 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-accent shadow-sm">
            <Target className="h-3.5 w-3.5" />
            Revenue Leak Audit
          </div>
          <h1 className="heading-display text-5xl font-black tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
            Find Where Your Business Is Leaking Revenue
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-text-secondary sm:text-xl">
            Analyze your Google profile, reviews, competitors, website, ads, and local positioning to uncover missed revenue opportunities.
          </p>
        </div>

        <form
          className="mx-auto mt-10 grid max-w-5xl gap-3 rounded-[2rem] border border-white/80 bg-white/90 p-3 shadow-soft-lg backdrop-blur lg:grid-cols-[minmax(0,1fr)_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            setOpen(false);
            void onSearch(businessName);
          }}
        >
          <label className="relative block">
            <span className="sr-only">Business name</span>
            <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              value={businessName}
              onChange={(e) => {
                setBusinessName(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              className={`${inputClass} pl-11`}
              placeholder="Business name"
              autoComplete="off"
            />
            {open && (suggestions.length > 0 || suggesting || hint) ? (
              <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-border bg-white text-left shadow-soft-lg">
                {suggesting ? (
                  <div className="flex items-center gap-2 px-4 py-3 text-sm text-text-secondary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching Google Business matches...
                  </div>
                ) : null}
                {suggestions.map((result) => (
                  <button
                    key={result.placeId}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setBusinessName(result.name);
                      setOpen(false);
                      void onSelectBusiness(result);
                    }}
                    className="block w-full border-t border-border/60 px-4 py-3 text-left transition-colors first:border-t-0 hover:bg-surface"
                  >
                    <span className="block text-sm font-bold text-text-primary">
                      {result.name}
                    </span>
                    <span className="mt-1 block text-xs text-text-secondary">
                      {result.address ?? "Address unavailable"} · {result.rating ?? "N/A"} rating · {result.reviewCount ?? 0} reviews
                    </span>
                  </button>
                ))}
                {hint ? (
                  <p className="border-t border-border/60 px-4 py-3 text-xs text-text-secondary">
                    {hint}
                  </p>
                ) : null}
              </div>
            ) : null}
          </label>
          <Button type="submit" size="lg" disabled={searching} className="h-full whitespace-nowrap">
            {searching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Find Revenue Leaks
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-text-secondary">
          Search your Google Business Profile to start your audit.
        </p>
      </div>
    </section>
  );
}

function AuditAnalyzingRing({ progress, secondsLeft }: { progress: number; secondsLeft: number }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const dash = clamped * circumference;
  const pct = Math.round(clamped * 100);
  return (
    <div className="relative h-10 w-10 shrink-0">
      <svg
        viewBox="0 0 56 56"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`Audit running, about ${secondsLeft} seconds on the timer and ${pct} percent of the progress ring`}
        className="absolute inset-0 h-full w-full -rotate-90"
      >
        <circle cx="28" cy="28" r={radius} fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke="white"
          strokeLinecap="round"
          strokeWidth="4"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-sm font-black tabular-nums leading-none tracking-tight text-white"
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.35)" }}
        aria-hidden
      >
        {secondsLeft}
      </span>
    </div>
  );
}

function AnalyzingScreen({
  step,
  ringProgress,
  secondsLeft,
}: {
  step: number;
  ringProgress: number;
  secondsLeft: number;
}) {
  const headlineIndex = Math.min(step, progressSteps.length - 1);
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-border bg-white p-8 shadow-soft-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-white">
            <AuditAnalyzingRing progress={ringProgress} secondsLeft={secondsLeft} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Running audit</p>
            <h2 className="text-2xl font-black text-text-primary">{progressSteps[headlineIndex]}</h2>
          </div>
        </div>
        <div className="mt-8 space-y-3">
          {progressSteps.map((label, index) => (
            <div key={label} className="flex items-center gap-3">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${
                  index <= step ? "border-accent bg-accent text-white" : "border-border bg-surface text-text-secondary"
                }`}
              >
                {index < step ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
              </span>
              <span className={index <= step ? "font-semibold text-text-primary" : "text-text-secondary"}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BrandSummary({ audit }: { audit: RevenueLeakAudit }) {
  const brandImageUrl =
    audit.brandIdentity.logoUrl ||
    googleBusinessProfilePhotoUrl(audit.business);

  return (
    <section className="rounded-[2rem] border border-border bg-white p-6 shadow-soft sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Brand summary</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-text-primary">Brand palette</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">{audit.brandIdentity.brandPresenceSummary}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface">
            {brandImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brandImageUrl} alt={`${audit.business.name} logo`} className="h-full w-full object-contain" />
            ) : (
              <Building2 className="h-8 w-8 text-text-secondary" />
            )}
          </div>
          <div className="flex gap-2">
            {audit.brandIdentity.palette.slice(0, 5).map((color) => (
              <span key={color} className="h-10 w-10 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: color }} title={color} />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-text-secondary">Primary</p>
          {audit.brandIdentity.primaryColor ? (
            <div className="mt-3 h-9 w-9 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: audit.brandIdentity.primaryColor }} />
          ) : (
            <p className="mt-2 font-black text-text-primary">Not found</p>
          )}
        </div>
        <div className="rounded-2xl bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-text-secondary">Accent</p>
          {audit.brandIdentity.accentColor ? (
            <div className="mt-3 h-9 w-9 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: audit.brandIdentity.accentColor }} />
          ) : (
            <p className="mt-2 font-black text-text-primary">Not found</p>
          )}
        </div>
        <div className="rounded-2xl bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-text-secondary">Typography</p>
          {audit.brandIdentity.typographyNotes.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {audit.brandIdentity.typographyNotes.slice(0, 4).map((font) => (
                <li key={font} className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
                  {font}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm font-semibold text-text-primary">
              No typography signal found
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function GoogleBusinessProfileSummary({ audit }: { audit: RevenueLeakAudit }) {
  const business = audit.business;
  const profilePhotoUrl = googleBusinessProfilePhotoUrl(business);
  const logoUrl = audit.brandIdentity.logoUrl?.trim() || null;
  const headerImageUrl = logoUrl ?? profilePhotoUrl;
  const headerImageIsLogo = Boolean(logoUrl);
  const identityAttributes = business.identityAttributes.filter((attribute) => attribute.detected);
  const statusLabel = business.businessStatus
    ? business.businessStatus.replace(/_/g, " ").toLowerCase()
    : "Status unavailable";

  const primaryPhone = business.phone ?? audit.websiteAudit.contactLinks.phone ?? null;
  const socialUrls = {
    ...EMPTY_PROSPECT_SOCIAL_URLS,
    facebook: audit.websiteAudit.socialLinks.facebook,
    instagram: audit.websiteAudit.socialLinks.instagram,
    tiktok: audit.websiteAudit.socialLinks.tiktok,
    youtube: audit.websiteAudit.socialLinks.youtube,
    linkedin: audit.websiteAudit.socialLinks.linkedin,
    whatsapp: audit.websiteAudit.socialLinks.whatsapp,
  };

  return (
    <section className="rounded-[2rem] border border-border bg-white p-6 shadow-soft sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div
            className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-border shadow-sm ${
              headerImageIsLogo ? "bg-white" : "bg-surface"
            }`}
          >
            {headerImageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={headerImageUrl}
                  alt={
                    headerImageIsLogo
                      ? `${business.name} logo`
                      : `${business.name} Google Business Profile photo`
                  }
                  className={
                    headerImageIsLogo
                      ? "max-h-full max-w-full object-contain p-2"
                      : "h-full w-full object-cover"
                  }
                />
              </>
            ) : (
              <Building2 className="h-10 w-10 text-text-secondary" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
              Google Business Profile
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-text-primary">
              {business.name}
            </h2>
            <p className="mt-2 text-sm font-semibold text-text-secondary">
              {business.category ?? "Local business"} · {statusLabel}
            </p>
            {business.address?.trim() ? (
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{business.address}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                {business.rating ?? "N/A"} rating
              </span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                {business.reviewCount ?? 0} reviews
              </span>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-violet-700">
                {business.photoCount ?? business.photos.length} photos
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                {business.website ? "Website linked" : "No website linked"}
              </span>
              {identityAttributes.map((attribute) => (
                <span
                  key={attribute.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-violet-700"
                  title={`Detected from ${attribute.source}`}
                >
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                  {attribute.label}
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-text-secondary">
              {primaryPhone ? (
                <span>
                  Phone:{" "}
                  <a href={`tel:${primaryPhone}`} className="font-mono font-semibold text-accent hover:underline">
                    {primaryPhone}
                  </a>
                </span>
              ) : (
                <span className="text-text-secondary/80">No phone on listing</span>
              )}
              {business.googleMapsUri ? (
                <a
                  href={business.googleMapsUri}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-accent hover:underline"
                >
                  Open in Google Maps
                </a>
              ) : null}
              {business.address?.trim() ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-accent hover:underline"
                >
                  Search address
                </a>
              ) : null}
            </div>
            <ContactChannelStrip
              websiteUrl={business.website}
              contactEmail={audit.websiteAudit.contactLinks.email}
              socialUrls={socialUrls}
              trailingItem={<AuditPdfIconButton audit={audit} />}
            />
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-4 self-start lg:items-end">
          <ScoreGauge score={audit.scores.overall} grade={audit.scores.grade} />
        </div>
      </div>
    </section>
  );
}

function CompetitorStrengthsPanel({ audit }: { audit: RevenueLeakAudit }) {
  const insight = audit.competitorStrengths;
  if (!insight || (insight.themes.length === 0 && !insight.topGap)) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-border bg-white p-4 text-sm text-text-secondary">
        {insight?.summary ?? "Competitor review samples were not available for this market."}
      </div>
    );
  }
  return (
    <div className="mt-4 rounded-2xl border border-border bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
        What competitors are praised for
      </p>
      <p className="mt-2 text-sm leading-6 text-text-primary">
        {insight.summaryCompetitorNames &&
        insight.summaryCompetitorNames.length > 0 &&
        insight.summarySuffix != null &&
        insight.summaryPrefix != null ? (
          <>
            {insight.summaryPrefix}
            {insight.summaryCompetitorNames.map((name, i) => (
              <span key={`${name}-${i}`}>
                {i > 0 ? ", " : null}
                <span className="font-bold">{name}</span>
              </span>
            ))}
            {insight.summarySuffix}
          </>
        ) : (
          insight.summary
        )}
      </p>
      {insight.themes.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {insight.themes.slice(0, 5).map((theme) => {
            const isGap = insight.topGap?.theme === theme.theme;
            return (
              <li
                key={theme.theme}
                className={`rounded-xl border px-3 py-2 ${isGap ? "border-accent/40 bg-accent/5" : "border-border bg-surface/60"}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-text-primary">
                    {theme.label}
                    {isGap ? (
                      <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                        biggest gap
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-text-secondary">
                    competitors {theme.competitorMentions}× · you {theme.ownMentions}×
                  </p>
                </div>
                {theme.praisedCompetitors.length > 0 ? (
                  <p className="mt-1 text-xs text-text-secondary">
                    <span>Praised in: </span>
                    {theme.praisedCompetitors.slice(0, 3).map((name, i) => (
                      <span key={`${theme.theme}-pr-${i}`}>
                        {i > 0 ? ", " : null}
                        <span className="font-bold text-text-primary">{name}</span>
                      </span>
                    ))}
                  </p>
                ) : null}
                {theme.exampleQuote ? (
                  <p className="mt-1 text-xs italic text-text-secondary">
                    “{theme.exampleQuote}”
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      <p className="mt-3 rounded-xl bg-surface/80 p-3 text-sm leading-6 text-text-primary">
        <span className="font-bold">Suggestion: </span>
        {insight.recommendation}
      </p>
    </div>
  );
}

function GoogleBusinessProfileChecklist({ business }: { business: BusinessProfile }) {
  const issueItems = useMemo(() => getGoogleBusinessProfileChecklistIssues(business), [business]);
  if (issueItems.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">Profile gaps</p>
      <ul className="mt-3 space-y-2.5">
        {issueItems.map((item) => (
          <li key={item.id} className="flex gap-3 text-sm">
            <span className="mt-0.5 shrink-0" aria-hidden>
              {item.status === "warn" ? (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </span>
            <div className="min-w-0">
              <p className="font-bold text-text-primary">{item.label}</p>
              <p className="text-xs leading-relaxed text-text-secondary">{item.hint}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionProblemAccordion({
  sections,
  audit,
}: {
  sections: SectionProblemSummary[];
  audit: RevenueLeakAudit;
}) {
  const [open, setOpen] = useState<string | null>(sections[0]?.category ?? null);
  return (
    <section className="rounded-[2rem] border border-border bg-white p-6 shadow-soft sm:p-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Problems found by section</p>
      </div>
      <div className="space-y-3">
        {sections.map((section) => {
          const isOpen = open === section.category;
          return (
            <div key={section.category} className="overflow-hidden rounded-3xl border border-border bg-white">
              <button type="button" onClick={() => setOpen(isOpen ? null : section.category)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
                <div>
                  <h3 className="font-black text-text-primary">{section.category}</h3>
                  <p className="mt-1 text-sm text-text-secondary">{section.summary}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="rounded-2xl bg-surface/80 p-2">
                    <ScoreGauge score={section.score} grade={section.grade} size={78} />
                  </div>
                  <ChevronDown className={`h-5 w-5 text-text-secondary transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </div>
              </button>
              {isOpen ? (
                <div className="border-t border-border bg-surface/50 p-5">
                  {section.category === "My Business vs Google Competitors" ? (
                    <CompetitorStrengthsPanel audit={audit} />
                  ) : null}
                  {section.category === "Google Business Profile" ? (
                    <GoogleBusinessProfileChecklist business={audit.business} />
                  ) : null}
                  {section.findings.length === 0 ? (
                    section.category === "Google Business Profile" ? (
                      getGoogleBusinessProfileChecklistIssues(audit.business).length === 0 ? (
                        <p className="mt-4 text-sm text-text-secondary">
                          No flagged GBP issues in the priority list above.
                        </p>
                      ) : null
                    ) : (
                      <p className="text-sm text-text-secondary">No major issues found in this section.</p>
                    )
                  ) : (
                    <div
                      className={
                        section.category === "Google Business Profile" ? "mt-4 space-y-3" : "space-y-3"
                      }
                    >
                      {section.findings.map((finding) => {
                        const sevColor =
                          finding.severity === "Critical"
                            ? "bg-red-100 text-red-800"
                            : finding.severity === "High"
                              ? "bg-red-50 text-red-700"
                              : finding.severity === "Medium"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-700";
                        const impactMid = Math.round(
                          (finding.estimatedRevenueImpactLow + finding.estimatedRevenueImpactHigh) / 2
                        );
                        const impactLabel =
                          impactMid > 0 ? `~$${impactMid.toLocaleString()}/mo at risk` : null;
                        return (
                          <div key={finding.id} className="rounded-2xl border border-border bg-white p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <h4 className="font-black text-text-primary">{finding.title}</h4>
                              <span className={`rounded-full px-3 py-1 text-xs font-bold ${sevColor}`}>{finding.severity}</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-text-secondary">
                              <span className="font-semibold text-text-primary">What we found: </span>
                              {finding.whatWeFound}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-text-secondary">
                              <span className="font-semibold text-text-primary">Why it matters: </span>
                              {finding.whyItMatters}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-text-secondary">
                              <span className="font-semibold text-text-primary">Recommended fix: </span>
                              {finding.recommendedFix}
                            </p>
                            {impactLabel ? (
                              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-accent">
                                {impactLabel}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

type MapMarkerHandle = { addListener: (event: string, cb: () => void) => void };

/** Minimal map surface used by the competitor map (full Maps typings not injected). */
type RevenueLeakGoogleMap = {
  fitBounds: (bounds: unknown, padding?: number | { top?: number; right?: number; bottom?: number; left?: number }) => void;
  getZoom: () => number | undefined;
  setZoom: (zoom: number) => void;
};

type WindowWithGoogle = Window & {
  google?: {
    maps: {
      Map: new (element: HTMLElement, options: Record<string, unknown>) => RevenueLeakGoogleMap;
      Marker: new (options: Record<string, unknown>) => MapMarkerHandle;
      Size: new (w: number, h: number) => { width: number; height: number };
      Point: new (x: number, y: number) => { x: number; y: number };
      InfoWindow: new () => { setContent: (content: string) => void; open: (options: Record<string, unknown>) => void };
      LatLngBounds: new () => { extend: (point: { lat: number; lng: number }) => void };
      event?: {
        addListenerOnce: (instance: unknown, eventName: string, handler: () => void) => void;
      };
      marker?: {
        AdvancedMarkerElement: new (options: Record<string, unknown>) => MapMarkerHandle;
      };
    };
  };
  __revenueLeakGoogleMapsPromise?: Promise<void>;
  initRevenueLeakGoogleMaps?: () => void;
};

function loadGoogleMaps(key: string): Promise<void> {
  const w = window as WindowWithGoogle;
  if (w.google?.maps) return Promise.resolve();
  if (w.__revenueLeakGoogleMapsPromise) return w.__revenueLeakGoogleMapsPromise;
  w.__revenueLeakGoogleMapsPromise = new Promise((resolve, reject) => {
    w.initRevenueLeakGoogleMaps = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=marker&v=weekly&callback=initRevenueLeakGoogleMaps`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Maps failed to load."));
    document.head.appendChild(script);
  });
  return w.__revenueLeakGoogleMapsPromise;
}

function competitorPinHeadLabel(
  point: CompetitorMapPoint,
  businessPosition: number | null | undefined,
  fallbackIndex: number
): string {
  if (point.isSelectedBusiness) {
    return businessPosition != null ? String(businessPosition) : "You";
  }
  if (point.rank != null) return String(point.rank);
  return String(fallbackIndex + 1);
}

function CompetitorMap({
  audit,
  points,
  googleMapsApiKey,
}: {
  audit: RevenueLeakAudit;
  points: CompetitorMapPoint[];
  googleMapsApiKey?: string | null;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapStatus, setMapStatus] = useState<string | null>(null);
  const initialKey = googleMapsApiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null;
  const [runtimeKey, setRuntimeKey] = useState<string | null>(initialKey);
  const [keyResolved, setKeyResolved] = useState(Boolean(initialKey));
  const key = runtimeKey;
  const businessPosition =
    audit.rankingSnapshot.selectedBusinessRankItem?.position ?? audit.rankingSnapshot.selectedBusinessPosition;

  useEffect(() => {
    if (runtimeKey) {
      setKeyResolved(true);
      return;
    }
    let cancelled = false;
    void fetch("/api/revenue-leak-audit/map-key", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { googleMapsApiKey?: string | null };
      })
      .then((data) => {
        if (cancelled) return;
        const nextKey = data?.googleMapsApiKey?.trim();
        if (nextKey) setRuntimeKey(nextKey);
        setKeyResolved(true);
      })
      .catch(() => {
        if (!cancelled) setKeyResolved(true);
      });
    return () => {
      cancelled = true;
    };
  }, [runtimeKey]);

  useEffect(() => {
    if (!key || !mapRef.current || points.length === 0) return;
    let cancelled = false;
    const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID?.trim() ?? "";
    void loadGoogleMaps(key)
      .then(async () => {
        if (cancelled || !mapRef.current) return;
        const w = window as WindowWithGoogle;
        const gmaps = w.google?.maps;
        if (!gmaps) return;
        const centerPoint = points.find((p) => p.isSelectedBusiness) ?? points[0];
        const mapOptions: Record<string, unknown> = {
          center: centerPoint.coordinates,
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        };
        if (mapId) mapOptions.mapId = mapId;
        const map = new gmaps.Map(mapRef.current, mapOptions) as RevenueLeakGoogleMap;
        const bounds = new gmaps.LatLngBounds();
        const info = new gmaps.InfoWindow();
        const AdvancedMarkerElement = gmaps.marker?.AdvancedMarkerElement;
        const useAdvanced = Boolean(mapId && AdvancedMarkerElement);

        const attachOpen = (marker: MapMarkerHandle, point: CompetitorMapPoint) => {
          marker.addListener("click", () => {
            info.setContent(
              `<strong>${point.name}</strong><br/>${point.address ?? ""}<br/>${point.reviewCount ?? 0} reviews`
            );
            info.open({ anchor: marker, map });
          });
        };

        if (useAdvanced && AdvancedMarkerElement) {
          for (let i = 0; i < points.length; i++) {
            const point = points[i]!;
            bounds.extend(point.coordinates);
            const style = resolveCategoryMarkerStyle(point);
            const headLabel = competitorPinHeadLabel(point, businessPosition, i);
            const content = buildCategoryMarkerElement({
              style,
              isSelected: point.isSelectedBusiness,
              headLabel,
            });
            const marker = new AdvancedMarkerElement({
              map,
              position: point.coordinates,
              content,
              title: point.name,
            });
            attachOpen(marker, point);
          }
        } else {
          await Promise.all(
            points.map(async (point, index) => {
              if (cancelled) return;
              bounds.extend(point.coordinates);
              const style = resolveCategoryMarkerStyle(point);
              const headLabel = competitorPinHeadLabel(point, businessPosition, index);
              const dataUrl = await compositeCategoryMarkerDataUrl(style, headLabel, point.isSelectedBusiness);
              const markerOptions: Record<string, unknown> = {
                position: point.coordinates,
                map,
                title: point.name,
              };
              if (dataUrl) {
                markerOptions.icon = {
                  url: dataUrl,
                  scaledSize: new gmaps.Size(CLASSIC_MARKER_PIN_LAYOUT.width, CLASSIC_MARKER_PIN_LAYOUT.height),
                  anchor: new gmaps.Point(CLASSIC_MARKER_PIN_LAYOUT.anchorX, CLASSIC_MARKER_PIN_LAYOUT.anchorY),
                };
              } else {
                markerOptions.label = {
                  text: competitorPinHeadLabel(point, businessPosition, index),
                  color: "#ffffff",
                  fontWeight: "bold",
                  fontSize: "13px",
                };
              }
              const marker = new gmaps.Marker(markerOptions);
              attachOpen(marker, point);
            })
          );
        }

        if (cancelled || !mapRef.current) return;
        map.fitBounds(bounds, { top: 96, right: 96, bottom: 96, left: 96 });
        const addListenerOnce = gmaps.event?.addListenerOnce;
        if (addListenerOnce) {
          addListenerOnce(map, "idle", () => {
            if (cancelled) return;
            const z = map.getZoom();
            if (typeof z !== "number") return;
            if (z > 17) map.setZoom(17);
            else if (z < 11 && points.length > 1) map.setZoom(11);
          });
        }
      })
      .catch(() => setMapStatus("Map unavailable."));
    return () => {
      cancelled = true;
      const el = mapRef.current;
      if (el) el.replaceChildren();
    };
  }, [key, points, businessPosition]);

  return (
    <section className="rounded-[2rem] border border-border bg-white p-6 shadow-soft sm:p-8">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Google competitors</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-text-primary">Competitor Map</h2>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-text-secondary">
            Pins are limited to businesses within about {COMPETITOR_MAP_LOCAL_RADIUS_MILES} miles of your listing when
            distance data is available (wider if needed so the map stays useful).
          </p>
        </div>
        <p className="text-sm text-text-secondary">
          {businessPosition != null ? (
            <>
              Your business is located in position{" "}
              <span className="font-black tabular-nums text-text-primary">#{businessPosition}</span> for this search.
            </>
          ) : (
            <>Your business&apos;s ranking position for this search isn&apos;t available.</>
          )}
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        {key && !mapStatus ? (
          <div ref={mapRef} className="min-h-[420px] overflow-hidden rounded-3xl border border-border bg-surface" />
        ) : (
          <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-dashed border-border bg-surface p-8 text-center">
            <div>
              <MapPin className="mx-auto h-10 w-10 text-accent" />
              <p className="mt-4 font-bold text-text-primary">
                {mapStatus ?? (keyResolved ? "Map key not configured" : "Loading map…")}
              </p>
              <p className="mt-2 text-sm text-text-secondary">The local ranking snapshot and PDF export still work.</p>
            </div>
          </div>
        )}
        <div className="max-h-[420px] min-h-0 overflow-auto pr-1">
          <LocalRankingSnapshotAside audit={audit} />
        </div>
      </div>
    </section>
  );
}

function LocalRankingSnapshotAside({ audit }: { audit: RevenueLeakAudit }) {
  const selectedInTopFive = audit.rankingSnapshot.topFive.some((item) => item.isSelectedBusiness);
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Who's beating you on Google</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">Local ranking snapshot</h2>
      <p className="mt-3 text-sm text-text-secondary">Query: {audit.rankingSnapshot.query}</p>
      <div className="mt-6 space-y-3">
        {audit.rankingSnapshot.topFive.map((item) => (
          <div key={`${item.position}-${item.placeId}`} className={`rounded-2xl border p-4 ${item.isSelectedBusiness ? "border-accent bg-accent/5" : "border-border bg-surface/60"}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-black text-text-primary">#{item.position} {item.name}</p>
              <p className="text-sm font-bold text-text-secondary">{item.rating ?? "N/A"} stars · {item.reviewCount ?? 0} reviews</p>
            </div>
          </div>
        ))}
        {!selectedInTopFive && audit.rankingSnapshot.selectedBusinessRankItem ? (
          <>
            <div className="py-1 text-center text-sm font-bold text-text-secondary">...</div>
            <div className="rounded-2xl border border-accent bg-accent/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-black text-text-primary">
                  #{audit.rankingSnapshot.selectedBusinessRankItem.position} {audit.rankingSnapshot.selectedBusinessRankItem.name}
                </p>
                <p className="text-sm font-bold text-text-secondary">
                  {audit.rankingSnapshot.selectedBusinessRankItem.rating ?? "N/A"} stars · {audit.rankingSnapshot.selectedBusinessRankItem.reviewCount ?? 0} reviews
                </p>
              </div>
            </div>
          </>
        ) : null}
        {!audit.rankingSnapshot.selectedBusinessRankItem ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            Not found in the first {audit.rankingSnapshot.totalResultsChecked} results checked.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RecentReviewSentimentSection({ audit }: { audit: RevenueLeakAudit }) {
  const { recent, sentiment, recommendations } = useMemo(
    () => buildLastReviewsSentimentBlock(audit.business.reviews, 5),
    [audit.business.reviews, audit.business.placeId]
  );

  return (
    <section className="rounded-[2rem] border border-border bg-white p-6 shadow-soft sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Review sentiment</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-text-primary">Last 5 reviews</h2>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-accent/25 bg-accent/10 px-4 py-2 text-sm font-black tabular-nums text-accent">
              Score {sentiment.sentimentScore}/100
            </span>
            <span className="text-xs font-semibold text-text-secondary">
              {sentiment.sampleSize} row{sentiment.sampleSize === 1 ? "" : "s"} in slice
            </span>
          </div>
        </div>
        <div className="flex max-w-xl flex-wrap justify-end gap-2">
          {sentiment.positiveThemes.map((theme) => (
            <span
              key={`pos-${theme}`}
              className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold capitalize text-emerald-800"
            >
              {theme}
            </span>
          ))}
          {sentiment.negativeThemes.map((theme) => (
            <span
              key={`neg-${theme}`}
              className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold capitalize text-red-700"
            >
              {theme}
            </span>
          ))}
        </div>
      </div>

      {recent.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          No review rows were returned in the current Google sample.
        </div>
      ) : (
        <div className="mt-6 divide-y divide-border overflow-hidden rounded-3xl border border-border">
          {recent.map((review, index) => (
            <div key={`${review.authorName ?? "review"}-${review.publishTime ?? index}`} className="bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-black text-accent">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-black text-text-primary">{review.authorName ?? "Google reviewer"}</p>
                    <p className="text-xs text-text-secondary">
                      {review.relativePublishTime ?? review.publishTime ?? "Date unavailable"}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                  {formatReviewStarLabel(review.rating)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                {review.text ?? "No written review text available."}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-surface/70 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Recommendations</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-text-primary">
          {recommendations.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function InteractiveReport({
  audit,
  onRestart,
  googleMapsApiKey,
}: {
  audit: RevenueLeakAudit;
  onRestart: () => void;
  googleMapsApiKey?: string | null;
}) {
  const lastUpdated = formatAuditLastUpdated(audit.createdAt);
  const [showAllThingsToImprove, setShowAllThingsToImprove] = useState(false);

  useEffect(() => {
    setShowAllThingsToImprove(false);
  }, [audit.id]);

  const findingsWithMoney = useMemo(
    () => applyAssumptionsToFindings(audit.assumptions, audit.findings),
    [audit.assumptions, audit.findings, audit.id]
  );

  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {lastUpdated ? (
          <p
            className="text-xs font-semibold tracking-wide text-text-secondary sm:text-right"
            title={audit.createdAt}
          >
            Last updated {lastUpdated}
          </p>
        ) : null}
        <GoogleBusinessProfileSummary audit={audit} />
        <BrandSummary audit={audit} />
        <RevenueLeakSnapshot
          audit={audit}
          moneySummary={audit.moneySummary}
          findingsWithMoney={findingsWithMoney}
          hideTopLeaks
        />
        <SectionProblemAccordion sections={audit.sectionSummaries} audit={audit} />
        <RecentReviewSentimentSection audit={audit} />
        <CompetitorMap audit={audit} points={audit.competitorMapPoints} googleMapsApiKey={googleMapsApiKey} />
        <section className="rounded-[2rem] border border-border bg-white p-6 shadow-soft sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Action plan</p>
          <RevenueLeakTopLeaksSection audit={audit} findingsWithMoney={findingsWithMoney} />
          <h2 className="mt-8 text-3xl font-black tracking-tight text-text-primary">Things to Improve</h2>
          <div className="mt-6 divide-y divide-border overflow-hidden rounded-3xl border border-border">
            {audit.actionPlan.map((item, index) => {
              if (!showAllThingsToImprove && index >= THINGS_TO_IMPROVE_INITIAL) return null;
              return (
              <div
                key={`action-plan-${index}`}
                className="flex gap-4 bg-white p-5 transition-colors hover:bg-surface/60"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-black text-accent">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-tight ${actionPlanImpactTagClasses(item.impact)}`}
                    >
                      Impact: {item.impact}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-tight ${actionPlanDifficultyTagClasses(item.difficulty)}`}
                    >
                      Difficulty: {item.difficulty}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-normal leading-relaxed text-text-primary">{item.fix}</p>
                </div>
              </div>
              );
            })}
          </div>
          {audit.actionPlan.length > THINGS_TO_IMPROVE_INITIAL ? (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAllThingsToImprove((v) => !v)}
                className="text-sm font-bold text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
              >
                {showAllThingsToImprove
                  ? "Show fewer"
                  : `+ ${audit.actionPlan.length - THINGS_TO_IMPROVE_INITIAL} more`}
              </button>
            </div>
          ) : null}
        </section>
        <div className="pt-2">
          <section className="rounded-[2rem] border border-accent/20 bg-white p-6 shadow-soft-lg sm:p-8">
            <RevenueLeakFixLeaksCta
              audit={audit}
              embedSurface
              surfaceEyebrow="Next step"
              surfaceTitle="Ready to recover lost revenue?"
              surfaceBody="We'll review your audit results with you, highlight the biggest opportunities, and recommend where to start."
              surfaceCtaLabel="Start fixing leaks"
            />
          </section>
        </div>
        <div className="flex justify-center pt-6">
          <button type="button" onClick={onRestart} className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-3 text-sm font-bold text-text-primary shadow-sm hover:border-accent/30">
            <RotateCcw className="h-4 w-4" />
            Start New Audit
          </button>
        </div>
      </div>
    </section>
  );
}

export default function RevenueLeakAuditClient({
  googleMapsApiKey = null,
}: {
  googleMapsApiKey?: string | null;
}) {
  const [stage, setStage] = useState<Stage>("search");
  const [searching, setSearching] = useState(false);
  const [audit, setAudit] = useState<RevenueLeakAudit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [progressStep, setProgressStep] = useState(0);
  const [analysisRingProgress, setAnalysisRingProgress] = useState(0);
  const [analysisSecondsLeft, setAnalysisSecondsLeft] = useState(ANALYSIS_COUNTDOWN_SECONDS);

  const warningList = useMemo(() => [...new Set(warnings)], [warnings]);

  async function startAuditFromSearch(businessName: string) {
    if (businessName.trim().length < 2) {
      setError("Enter a business name.");
      return;
    }
    setSearching(true);
    setError(null);
    setWarnings([]);
    setAudit(null);
    try {
      const res = await fetch("/api/revenue-leak-audit/business-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName }),
      });
      const data = (await res.json()) as SearchResponse;
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Search failed.");
      setWarnings(data.warnings ?? []);
      const firstMatch = data.businesses?.[0];
      if (!firstMatch) {
        throw new Error("No Google Business Profile matches were found.");
      }
      await selectBusiness(firstMatch);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function selectBusiness(result: BusinessSearchResult) {
    setSearching(true);
    setError(null);
    try {
      const res = await fetch("/api/revenue-leak-audit/business-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: result.placeId }),
      });
      const data = (await res.json()) as DetailsResponse;
      if (!res.ok || !data.ok || !data.business) {
        throw new Error(data.error ?? "Could not load business details.");
      }
      const profile = data.business;
      setWarnings((prev) => [...prev, ...(data.warnings ?? [])]);
      await startAudit(profile);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load business details.");
    } finally {
      setSearching(false);
    }
  }

  async function startAudit(business: BusinessProfile) {
    setStage("analyzing");
    setError(null);
    setProgressStep(0);
    setAnalysisRingProgress(0);
    setAnalysisSecondsLeft(ANALYSIS_COUNTDOWN_SECONDS);

    const analysisStart = Date.now();
    let ringRafId = 0;
    let ringLoopCancelled = false;

    const tickRing = () => {
      if (ringLoopCancelled) return;
      const elapsed = Date.now() - analysisStart;
      setAnalysisRingProgress(Math.min(ANALYSIS_RING_INDETERMINATE_CAP, elapsed / ESTIMATED_ANALYSIS_MS));
      setAnalysisSecondsLeft(Math.max(0, Math.ceil((ESTIMATED_ANALYSIS_MS - elapsed) / 1000)));
      ringRafId = requestAnimationFrame(tickRing);
    };
    ringRafId = requestAnimationFrame(tickRing);

    const interval = window.setInterval(() => {
      setProgressStep((s) => Math.min(PROGRESS_AUTOSTEP_CAP, s + 1));
    }, 900);
    try {
      const res = await fetch("/api/revenue-leak-audit/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business, assumptions: {} }),
        signal: AbortSignal.timeout(ESTIMATED_ANALYSIS_MS),
      });
      const data = (await res.json()) as AnalyzeResponse;
      if (!res.ok || !data.ok || !data.audit) throw new Error(data.error ?? "Audit failed.");

      ringLoopCancelled = true;
      cancelAnimationFrame(ringRafId);
      setAnalysisSecondsLeft(0);
      setAnalysisRingProgress(1);
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 240);
      });

      setProgressStep(progressSteps.length - 1);
      setAudit(data.audit);
      setWarnings((prev) => [...prev, ...(data.warnings ?? [])]);
      setStage("report");
    } catch (e) {
      const aborted =
        (typeof DOMException !== "undefined" &&
          e instanceof DOMException &&
          e.name === "AbortError") ||
        (e instanceof Error && e.name === "AbortError");
      setError(
        aborted
          ? "Audit took longer than 60 seconds — try again."
          : e instanceof Error
            ? e.message
            : "Audit failed."
      );
      setStage("search");
    } finally {
      ringLoopCancelled = true;
      cancelAnimationFrame(ringRafId);
      window.clearInterval(interval);
    }
  }

  function restart() {
    setStage("search");
    setAudit(null);
    setError(null);
    setWarnings([]);
    setProgressStep(0);
    setAnalysisRingProgress(0);
    setAnalysisSecondsLeft(ANALYSIS_COUNTDOWN_SECONDS);
  }

  return (
    <>
      {stage === "search" ? (
        <>
          <HeroSearch
            onSearch={startAuditFromSearch}
            onSelectBusiness={selectBusiness}
            searching={searching}
          />
          {error ? <InlineAlert message={error} tone="error" /> : null}
        </>
      ) : null}
      {stage === "analyzing" ? (
        <AnalyzingScreen
          step={progressStep}
          ringProgress={analysisRingProgress}
          secondsLeft={analysisSecondsLeft}
        />
      ) : null}
      {stage === "report" && audit ? (
        <InteractiveReport audit={audit} onRestart={restart} googleMapsApiKey={googleMapsApiKey} />
      ) : null}
      {warningList.length > 0 ? (
        <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <div className="flex gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-bold">Audit notes</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {warningList.slice(0, 6).map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function InlineAlert({ message, tone }: { message: string; tone: "error" | "info" }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
      <div className={`rounded-2xl border p-4 text-sm font-semibold ${tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}>
        {message}
      </div>
    </div>
  );
}
