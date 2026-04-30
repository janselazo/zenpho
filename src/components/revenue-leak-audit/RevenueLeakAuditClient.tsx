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
} from "lucide-react";
import ContactChannelStrip from "@/components/crm/ContactChannelStrip";
import Button from "@/components/ui/Button";
import { EMPTY_PROSPECT_SOCIAL_URLS } from "@/lib/crm/prospect-enrichment-types";
import type {
  AuditGrade,
  BusinessProfile,
  BusinessSearchResult,
  CompetitorMapPoint,
  RevenueLeakAudit,
  SectionProblemSummary,
} from "@/lib/revenue-leak-audit/types";
import {
  extractComplaintThemes,
  formatReviewStarLabel,
  selectLowestRatedReviews,
} from "@/lib/revenue-leak-audit/review-selection";

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
          className="mx-auto mt-10 grid max-w-4xl gap-3 rounded-[2rem] border border-white/80 bg-white/90 p-3 shadow-soft-lg backdrop-blur md:grid-cols-[1fr_auto]"
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

function AnalyzingScreen({ step }: { step: number }) {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-border bg-white p-8 shadow-soft-lg">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Running audit</p>
            <h2 className="text-2xl font-black text-text-primary">{progressSteps[Math.min(step, progressSteps.length - 1)]}</h2>
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
          <h2 className="mt-2 text-3xl font-black tracking-tight text-text-primary">Extracted brand signals</h2>
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
  const profileImageUrl = googleBusinessProfilePhotoUrl(business) || audit.brandIdentity.logoUrl;
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
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
            {profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileImageUrl}
                alt={`${business.name} Google Business Profile logo`}
                className="h-full w-full object-cover"
              />
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
              showFootnote={false}
              footnote="Icons reflect links found on the business website from this audit. Listing phone and Maps appear above."
            />
          </div>
        </div>
        <ScoreGauge score={audit.scores.overall} grade={audit.scores.grade} />
      </div>
    </section>
  );
}

function FoundIssuesMoneySummary({ audit }: { audit: RevenueLeakAudit }) {
  const m = audit.moneySummary;
  const leakLowPct = Math.round(m.combinedLeakRateLow * 100);
  const leakHighPct = Math.round(m.combinedLeakRateHigh * 100);
  return (
    <section className="rounded-[2rem] border border-accent/15 bg-gradient-to-br from-accent to-accent-hover p-6 text-white shadow-soft-lg sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Found issues & estimated cost</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight">
            We found {m.totalIssues} revenue leaks
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/80">{m.assumptionsExplanation}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {Object.entries(m.severityCounts).map(([severity, count]) => (
              <span key={severity} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold">
                {severity}: {count}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-6 text-text-primary shadow-soft">
          <p className="text-sm font-bold text-text-secondary">Estimated monthly cost</p>
          <p className="mt-2 text-3xl font-black">
            {formatMoney(m.estimatedMonthlyCostLow)}-{formatMoney(m.estimatedMonthlyCostHigh)}
          </p>
          <p className="mt-1 text-xs font-semibold text-text-secondary">
            ~{leakLowPct}%-{leakHighPct}% of {formatMoney(m.addressableMonthlyRevenue)} addressable / mo
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-2xl bg-surface/80 px-3 py-2">
              <p className="font-semibold text-text-secondary">Leads lost / mo</p>
              <p className="mt-0.5 text-base font-black text-text-primary">
                {m.lostLeadsPerMonthLow}-{m.lostLeadsPerMonthHigh}
              </p>
            </div>
            <div className="rounded-2xl bg-surface/80 px-3 py-2">
              <p className="font-semibold text-text-secondary">Jobs lost / mo</p>
              <p className="mt-0.5 text-base font-black text-text-primary">
                {m.lostJobsPerMonthLow}-{m.lostJobsPerMonthHigh}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm font-bold text-text-secondary">Annualized risk</p>
          <p className="mt-1 text-xl font-black">
            {formatMoney(m.estimatedAnnualCostLow)}-{formatMoney(m.estimatedAnnualCostHigh)}
          </p>
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
      <p className="mt-2 text-sm leading-6 text-text-primary">{insight.summary}</p>
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
                    Praised in: {theme.praisedCompetitors.slice(0, 3).join(", ")}
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
                  {section.findings.length === 0 ? (
                    <p className="text-sm text-text-secondary">No major issues found in this section.</p>
                  ) : (
                    <div className="space-y-3">
                      {section.findings.map((finding) => {
                        const sevColor =
                          finding.severity === "Critical"
                            ? "bg-red-100 text-red-800"
                            : finding.severity === "High"
                              ? "bg-red-50 text-red-700"
                              : finding.severity === "Medium"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-700";
                        const impactLow = Math.round(finding.estimatedRevenueImpactLow);
                        const impactHigh = Math.round(finding.estimatedRevenueImpactHigh);
                        const impactRange =
                          impactLow > 0 || impactHigh > 0
                            ? `~$${impactLow.toLocaleString()}–$${impactHigh.toLocaleString()}/mo at risk`
                            : null;
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
                            {impactRange ? (
                              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-accent">
                                {impactRange}
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

type WindowWithGoogle = Window & {
  google?: {
    maps: {
      Map: new (element: HTMLElement, options: Record<string, unknown>) => { fitBounds: (bounds: unknown) => void };
      Marker: new (options: Record<string, unknown>) => { addListener: (event: string, cb: () => void) => void };
      InfoWindow: new () => { setContent: (content: string) => void; open: (options: Record<string, unknown>) => void };
      LatLngBounds: new () => { extend: (point: { lat: number; lng: number }) => void };
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=initRevenueLeakGoogleMaps`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Maps failed to load."));
    document.head.appendChild(script);
  });
  return w.__revenueLeakGoogleMapsPromise;
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
  const businessPosition = audit.rankingSnapshot.selectedBusinessPosition;

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
    void loadGoogleMaps(key)
      .then(() => {
        if (cancelled || !mapRef.current) return;
        const w = window as WindowWithGoogle;
        if (!w.google?.maps) return;
        const map = new w.google.maps.Map(mapRef.current, {
          center: points[0].coordinates,
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        const bounds = new w.google.maps.LatLngBounds();
        const info = new w.google.maps.InfoWindow();
        for (const point of points) {
          bounds.extend(point.coordinates);
          const marker = new w.google.maps.Marker({
            position: point.coordinates,
            map,
            title: point.name,
            label: point.isSelectedBusiness
              ? businessPosition
                ? String(businessPosition)
                : "You"
              : String(point.rank ?? ""),
          });
          marker.addListener("click", () => {
            info.setContent(`<strong>${point.name}</strong><br/>${point.address ?? ""}<br/>${point.reviewCount ?? 0} reviews`);
            info.open({ anchor: marker, map });
          });
        }
        map.fitBounds(bounds);
      })
      .catch(() => setMapStatus("Map unavailable."));
    return () => {
      cancelled = true;
    };
  }, [key, points]);

  return (
    <section className="rounded-[2rem] border border-border bg-white p-6 shadow-soft sm:p-8">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Google competitors</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-text-primary">Interactive competitor map</h2>
        </div>
        <p className="text-sm text-text-secondary">{points.filter((p) => !p.isSelectedBusiness).length} direct competitors mapped</p>
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

function LowestReviewAnalysis({ audit }: { audit: RevenueLeakAudit }) {
  const lowestReviews = selectLowestRatedReviews(audit.business.reviews, 5);
  const combined = lowestReviews
    .map((review) => review.text ?? "")
    .join(" ")
    .toLowerCase();
  const themes = extractComplaintThemes(combined, 6);
  const sampleStarRatings = lowestReviews.filter((r) => typeof r.rating === "number").map((r) => r.rating!);
  const minSampleRating =
    sampleStarRatings.length > 0 ? Math.min(...sampleStarRatings) : null;
  const onlyHighStarsInSample = minSampleRating !== null && minSampleRating >= 5;

  return (
    <section className="rounded-[2rem] border border-border bg-white p-6 shadow-soft sm:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
            Lowest review analysis
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-text-primary">
            Top 5 lowest reviews
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">
            These reviews show the complaints most likely to reduce trust when buyers compare you against competitors.
          </p>
        </div>
        {themes.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {themes.map((theme) => (
              <span
                key={theme}
                className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold capitalize text-red-700"
              >
                {theme}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {onlyHighStarsInSample ? (
        <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
          Google returns at most five reviews per place, sorted for relevance, so this list may not include
          lower-star reviews even when they exist on your profile. We still ordered this sample by the lowest
          ratings available and surfaced reviews with complaint-like wording first when stars tie.
        </div>
      ) : null}

      {lowestReviews.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          Review text was not available from the current Google sample.
        </div>
      ) : (
        <div className="mt-6 divide-y divide-border overflow-hidden rounded-3xl border border-border">
          {lowestReviews.map((review, index) => (
            <div key={`${review.authorName ?? "review"}-${index}`} className="bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-sm font-black text-red-700">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-black text-text-primary">
                      {review.authorName ?? "Google reviewer"}
                    </p>
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
    </section>
  );
}

function DownloadPdfBanner({ audit }: { audit: RevenueLeakAudit }) {
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
    <section className="rounded-[2rem] border border-accent/20 bg-white p-6 shadow-soft-lg sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Final export step</p>
          <h2 className="mt-2 text-2xl font-black text-text-primary">Ready to share this audit?</h2>
          <p className="mt-2 text-sm text-text-secondary">The PDF is generated only when you click this button, after reviewing the interactive report.</p>
          {error ? <p className="mt-2 text-sm font-semibold text-red-600">{error}</p> : null}
        </div>
        <Button onClick={download} disabled={downloading} size="lg">
          {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Download PDF Report
        </Button>
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
  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <GoogleBusinessProfileSummary audit={audit} />
        <BrandSummary audit={audit} />
        <FoundIssuesMoneySummary audit={audit} />
        <SectionProblemAccordion sections={audit.sectionSummaries} audit={audit} />
        <LowestReviewAnalysis audit={audit} />
        <CompetitorMap audit={audit} points={audit.competitorMapPoints} googleMapsApiKey={googleMapsApiKey} />
        <section className="rounded-[2rem] border border-border bg-white p-6 shadow-soft sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Action plan</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-text-primary">What to fix first</h2>
          <div className="mt-6 divide-y divide-border overflow-hidden rounded-3xl border border-border">
            {audit.actionPlan.map((item, index) => (
              <div
                key={`${item.fix}-${index}`}
                className="flex gap-4 bg-white p-5 transition-colors hover:bg-surface/60"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-black text-accent">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold text-text-secondary">
                      Impact: {item.impact}
                    </span>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold text-text-secondary">
                      Difficulty: {item.difficulty}
                    </span>
                  </div>
                  <h3 className="mt-2 font-black leading-snug text-text-primary">
                    {item.fix}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </section>
        <DownloadPdfBanner audit={audit} />
        <div className="flex justify-center">
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
      setWarnings((prev) => [...prev, ...(data.warnings ?? [])]);
      await startAudit(data.business);
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
    const interval = window.setInterval(() => {
      setProgressStep((step) => Math.min(progressSteps.length - 1, step + 1));
    }, 900);
    try {
      const res = await fetch("/api/revenue-leak-audit/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business, assumptions: {} }),
      });
      const data = (await res.json()) as AnalyzeResponse;
      if (!res.ok || !data.ok || !data.audit) throw new Error(data.error ?? "Audit failed.");
      setAudit(data.audit);
      setWarnings((prev) => [...prev, ...(data.warnings ?? [])]);
      setStage("report");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audit failed.");
      setStage("search");
    } finally {
      window.clearInterval(interval);
    }
  }

  function restart() {
    setStage("search");
    setAudit(null);
    setError(null);
    setWarnings([]);
    setProgressStep(0);
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
      {stage === "analyzing" ? <AnalyzingScreen step={progressStep} /> : null}
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
