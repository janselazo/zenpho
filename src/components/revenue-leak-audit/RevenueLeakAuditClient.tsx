"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
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
import Button from "@/components/ui/Button";
import type {
  AuditGrade,
  BusinessProfile,
  BusinessSearchResult,
  CompetitorMapPoint,
  RevenueLeakAudit,
  SectionProblemSummary,
} from "@/lib/revenue-leak-audit/types";

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

type Stage = "search" | "assumptions" | "analyzing" | "report";

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

type AssumptionFormValues = {
  industry: string;
  averageJobValue: number;
  closeRate: number;
  estimatedMonthlyLeads: number;
  serviceArea: string;
  monthlyAdSpend: number | null;
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
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#e8ecf1" strokeWidth="13" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={scoreColor(score)}
          strokeLinecap="round"
          strokeWidth="13"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black tracking-tight text-text-primary">{score}</span>
        <span className={`mt-1 rounded-full border px-2.5 py-1 text-xs font-bold ${gradeClasses(grade)}`}>
          {grade}
        </span>
      </div>
    </div>
  );
}

function HeroSearch({
  onSearch,
  searching,
}: {
  onSearch: (businessName: string, city: string) => void;
  searching: boolean;
}) {
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
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
          className="mx-auto mt-10 grid max-w-5xl gap-3 rounded-[2rem] border border-white/80 bg-white/90 p-3 shadow-soft-lg backdrop-blur md:grid-cols-[1.2fr_0.8fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch(businessName, city);
          }}
        >
          <label className="relative block">
            <span className="sr-only">Business name</span>
            <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className={`${inputClass} pl-11`}
              placeholder="Business name"
            />
          </label>
          <label className="relative block">
            <span className="sr-only">City or service area</span>
            <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={`${inputClass} pl-11`}
              placeholder="City / service area"
            />
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

function SearchResults({
  results,
  onSelect,
  loadingId,
}: {
  results: BusinessSearchResult[];
  onSelect: (result: BusinessSearchResult) => void;
  loadingId: string | null;
}) {
  if (results.length === 0) return null;
  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">Choose your business</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-text-primary">Google Business matches</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {results.map((result) => (
            <button
              key={result.placeId}
              type="button"
              onClick={() => onSelect(result)}
              className="group rounded-3xl border border-border bg-white p-6 text-left shadow-soft transition-all hover:border-accent/30 hover:shadow-soft-lg"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-text-primary">{result.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">{result.address ?? "Address unavailable"}</p>
                </div>
                {loadingId === result.placeId ? (
                  <Loader2 className="h-5 w-5 animate-spin text-accent" />
                ) : (
                  <ArrowRight className="h-5 w-5 text-text-secondary transition-transform group-hover:translate-x-1 group-hover:text-accent" />
                )}
              </div>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full bg-surface px-3 py-1 text-text-secondary">{result.category ?? "Local business"}</span>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{result.rating ?? "N/A"} rating</span>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{result.reviewCount ?? 0} reviews</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                  {result.website ? "Website linked" : "No website"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function AssumptionsForm({
  business,
  onBack,
  onSubmit,
}: {
  business: BusinessProfile;
  onBack: () => void;
  onSubmit: (values: AssumptionFormValues) => void;
}) {
  const [industry, setIndustry] = useState(business.category ?? "");
  const [averageJobValue, setAverageJobValue] = useState("2500");
  const [closeRate, setCloseRate] = useState("25");
  const [estimatedMonthlyLeads, setEstimatedMonthlyLeads] = useState("40");
  const [serviceArea, setServiceArea] = useState(business.address?.split(",").slice(-2, -1)[0]?.trim() ?? "");
  const [monthlyAdSpend, setMonthlyAdSpend] = useState("");
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Selected business</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-text-primary">{business.name}</h2>
          <p className="mt-3 text-sm leading-6 text-text-secondary">{business.address}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-surface p-4">
              <p className="text-text-secondary">Rating</p>
              <p className="mt-1 font-black text-text-primary">{business.rating ?? "N/A"}</p>
            </div>
            <div className="rounded-2xl bg-surface p-4">
              <p className="text-text-secondary">Reviews</p>
              <p className="mt-1 font-black text-text-primary">{business.reviewCount ?? 0}</p>
            </div>
          </div>
          <button type="button" onClick={onBack} className="mt-6 text-sm font-bold text-accent hover:text-accent-hover">
            Choose another business
          </button>
        </div>
        <form
          className="rounded-3xl border border-border bg-white p-6 shadow-soft sm:p-8"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit({
              industry,
              averageJobValue: Number(averageJobValue),
              closeRate: Number(closeRate) / 100,
              estimatedMonthlyLeads: Number(estimatedMonthlyLeads),
              serviceArea,
              monthlyAdSpend: monthlyAdSpend ? Number(monthlyAdSpend) : null,
            });
          }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Audit assumptions</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-text-primary">Confirm the revenue math</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Industry/category</span>
              <input className={inputClass} value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Service area/city</span>
              <input className={inputClass} value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Average job value</span>
              <input className={inputClass} type="number" min="1" value={averageJobValue} onChange={(e) => setAverageJobValue(e.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Estimated close rate (%)</span>
              <input className={inputClass} type="number" min="1" max="100" value={closeRate} onChange={(e) => setCloseRate(e.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Estimated monthly leads</span>
              <input className={inputClass} type="number" min="1" value={estimatedMonthlyLeads} onChange={(e) => setEstimatedMonthlyLeads(e.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-bold text-text-primary">Monthly ad spend (optional)</span>
              <input className={inputClass} type="number" min="0" value={monthlyAdSpend} onChange={(e) => setMonthlyAdSpend(e.target.value)} />
            </label>
          </div>
          <Button type="submit" size="lg" className="mt-8 w-full sm:w-auto">
            Start Findings
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
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
            {audit.brandIdentity.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={audit.brandIdentity.logoUrl} alt={`${audit.business.name} logo`} className="max-h-full max-w-full object-contain" />
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
          <p className="mt-2 font-black text-text-primary">{audit.brandIdentity.primaryColor ?? "Not found"}</p>
        </div>
        <div className="rounded-2xl bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-text-secondary">Accent</p>
          <p className="mt-2 font-black text-text-primary">{audit.brandIdentity.accentColor ?? "Not found"}</p>
        </div>
        <div className="rounded-2xl bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-text-secondary">Typography</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{audit.brandIdentity.typographyNotes[0] ?? "No typography signal found"}</p>
        </div>
      </div>
    </section>
  );
}

function FoundIssuesMoneySummary({ audit }: { audit: RevenueLeakAudit }) {
  return (
    <section className="rounded-[2rem] border border-accent/15 bg-gradient-to-br from-accent to-accent-hover p-6 text-white shadow-soft-lg sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Found issues & estimated cost</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight">
            We found {audit.moneySummary.totalIssues} revenue leaks
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/80">{audit.moneySummary.assumptionsExplanation}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {Object.entries(audit.moneySummary.severityCounts).map(([severity, count]) => (
              <span key={severity} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold">
                {severity}: {count}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-6 text-text-primary shadow-soft">
          <p className="text-sm font-bold text-text-secondary">Estimated monthly cost</p>
          <p className="mt-2 text-3xl font-black">
            {formatMoney(audit.moneySummary.estimatedMonthlyCostLow)}-{formatMoney(audit.moneySummary.estimatedMonthlyCostHigh)}
          </p>
          <p className="mt-4 text-sm font-bold text-text-secondary">Annualized risk</p>
          <p className="mt-1 text-xl font-black">
            {formatMoney(audit.moneySummary.estimatedAnnualCostLow)}-{formatMoney(audit.moneySummary.estimatedAnnualCostHigh)}
          </p>
        </div>
      </div>
    </section>
  );
}

function SectionProblemAccordion({ sections }: { sections: SectionProblemSummary[] }) {
  const [open, setOpen] = useState<string | null>(sections[0]?.category ?? null);
  return (
    <section className="rounded-[2rem] border border-border bg-white p-6 shadow-soft sm:p-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Problems found by section</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-text-primary">FAQ-style issue breakdown</h2>
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
                <div className="flex items-center gap-3">
                  <ScoreGauge score={section.score} grade={section.grade} size={84} />
                  <ChevronDown className={`h-5 w-5 text-text-secondary transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </div>
              </button>
              {isOpen ? (
                <div className="border-t border-border bg-surface/50 p-5">
                  {section.findings.length === 0 ? (
                    <p className="text-sm text-text-secondary">No major issues found in this section.</p>
                  ) : (
                    <div className="space-y-3">
                      {section.findings.map((finding) => (
                        <div key={finding.id} className="rounded-2xl border border-border bg-white p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <h4 className="font-black text-text-primary">{finding.title}</h4>
                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">{finding.severity}</span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-text-secondary">{finding.whatWeFound}</p>
                          <p className="mt-2 text-sm font-semibold text-text-primary">
                            Cost: {formatMoney(finding.estimatedRevenueImpactLow)}-{formatMoney(finding.estimatedRevenueImpactHigh)}/mo
                          </p>
                          <p className="mt-2 text-sm leading-6 text-text-secondary">Fix: {finding.recommendedFix}</p>
                        </div>
                      ))}
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

function CompetitorMap({ points }: { points: CompetitorMapPoint[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(points[0]?.id ?? "");
  const [mapStatus, setMapStatus] = useState<string | null>(null);
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const selectedPoint = points.find((p) => p.id === selected) ?? points[0];

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
            label: point.isSelectedBusiness ? "You" : String(point.rank ?? ""),
          });
          marker.addListener("click", () => {
            setSelected(point.id);
            info.setContent(`<strong>${point.name}</strong><br/>${point.address ?? ""}<br/>${point.reviewCount ?? 0} reviews`);
            info.open({ anchor: marker, map });
          });
        }
        map.fitBounds(bounds);
      })
      .catch(() => setMapStatus("Map unavailable. Showing competitor list instead."));
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
              <p className="mt-4 font-bold text-text-primary">{mapStatus ?? "Map key not configured"}</p>
              <p className="mt-2 text-sm text-text-secondary">The competitor list remains interactive and the PDF can still be generated.</p>
            </div>
          </div>
        )}
        <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
          {points.map((point) => (
            <button
              type="button"
              key={point.id}
              onClick={() => setSelected(point.id)}
              className={`w-full rounded-2xl border p-4 text-left transition-all ${
                selectedPoint?.id === point.id ? "border-accent bg-accent/5" : "border-border bg-white hover:border-accent/25"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-text-primary">{point.isSelectedBusiness ? "Your business" : `#${point.rank ?? "-"} ${point.name}`}</p>
                  <p className="mt-1 text-xs text-text-secondary">{point.address}</p>
                </div>
                <span className="rounded-full bg-surface px-2 py-1 text-xs font-bold text-text-secondary">{point.marketStrengthScore}</span>
              </div>
              <p className="mt-2 text-xs text-text-secondary">{point.rating ?? "N/A"} stars · {point.reviewCount ?? 0} reviews</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function RankingSnapshot({ audit }: { audit: RevenueLeakAudit }) {
  const selectedInTopFive = audit.rankingSnapshot.topFive.some((item) => item.isSelectedBusiness);
  return (
    <section className="rounded-[2rem] border border-border bg-white p-6 shadow-soft sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Who's beating you on Google</p>
      <h2 className="mt-2 text-3xl font-black tracking-tight text-text-primary">Local ranking snapshot</h2>
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
    </section>
  );
}

function ScoreBreakdown({ audit }: { audit: RevenueLeakAudit }) {
  const rows = [
    ["GBP Health", audit.scores.gbpHealth],
    ["Reviews", audit.scores.reviews],
    ["Website Conversion", audit.scores.websiteConversion],
    ["Website Trust", audit.scores.websiteTrust],
    ["Local SEO", audit.scores.localSeo],
    ["Competitor Gap", audit.scores.competitorGap],
    ["Tracking & Ads", audit.scores.trackingAds],
    ["Photos", audit.scores.photos],
  ] as const;
  return (
    <section className="rounded-[2rem] border border-border bg-white p-6 shadow-soft sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Score breakdown</p>
      <h2 className="mt-2 text-3xl font-black tracking-tight text-text-primary">What is driving the grade</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {rows.map(([label, score]) => (
          <div key={label} className="rounded-2xl bg-surface p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="font-bold text-text-primary">{label}</p>
              <p className="font-black" style={{ color: scoreColor(score) }}>{score}/100</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: scoreColor(score) }} />
            </div>
          </div>
        ))}
      </div>
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

function InteractiveReport({ audit, onRestart }: { audit: RevenueLeakAudit; onRestart: () => void }) {
  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[2rem] border border-border bg-white p-6 shadow-soft sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Interactive report</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight text-text-primary">{audit.business.name}</h1>
              <p className="mt-3 text-sm leading-6 text-text-secondary">{audit.business.address} · {audit.business.category}</p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{audit.business.rating ?? "N/A"} rating</span>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{audit.business.reviewCount ?? 0} reviews</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{audit.business.website ? "Website linked" : "No website"}</span>
              </div>
            </div>
            <ScoreGauge score={audit.scores.overall} grade={audit.scores.grade} />
          </div>
        </div>

        <BrandSummary audit={audit} />
        <FoundIssuesMoneySummary audit={audit} />
        <SectionProblemAccordion sections={audit.sectionSummaries} />
        <div className="grid gap-6 xl:grid-cols-2">
          <RankingSnapshot audit={audit} />
          <ScoreBreakdown audit={audit} />
        </div>
        <CompetitorMap points={audit.competitorMapPoints} />
        <section className="rounded-[2rem] border border-border bg-white p-6 shadow-soft sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Action plan</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-text-primary">What to fix first</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {audit.actionPlan.map((item, index) => (
              <div key={`${item.fix}-${index}`} className="rounded-2xl border border-border bg-surface/60 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">{item.timeline}</p>
                <h3 className="mt-2 font-black text-text-primary">{item.fix}</h3>
                <p className="mt-2 text-sm text-text-secondary">Impact: {item.impact} · Difficulty: {item.difficulty}</p>
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

export default function RevenueLeakAuditClient() {
  const [stage, setStage] = useState<Stage>("search");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<BusinessSearchResult[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessProfile | null>(null);
  const [loadingBusinessId, setLoadingBusinessId] = useState<string | null>(null);
  const [audit, setAudit] = useState<RevenueLeakAudit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [progressStep, setProgressStep] = useState(0);

  const warningList = useMemo(() => [...new Set(warnings)], [warnings]);

  async function runSearch(businessName: string, city: string) {
    if (businessName.trim().length < 2) {
      setError("Enter a business name.");
      return;
    }
    setSearching(true);
    setError(null);
    setWarnings([]);
    try {
      const res = await fetch("/api/revenue-leak-audit/business-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, city }),
      });
      const data = (await res.json()) as SearchResponse;
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Search failed.");
      setSearchResults(data.businesses ?? []);
      setWarnings(data.warnings ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function selectBusiness(result: BusinessSearchResult) {
    setLoadingBusinessId(result.placeId);
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
      setSelectedBusiness(data.business);
      setWarnings((prev) => [...prev, ...(data.warnings ?? [])]);
      setStage("assumptions");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load business details.");
    } finally {
      setLoadingBusinessId(null);
    }
  }

  async function startAudit(assumptions: AssumptionFormValues) {
    if (!selectedBusiness) return;
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
        body: JSON.stringify({ business: selectedBusiness, assumptions }),
      });
      const data = (await res.json()) as AnalyzeResponse;
      if (!res.ok || !data.ok || !data.audit) throw new Error(data.error ?? "Audit failed.");
      setAudit(data.audit);
      setWarnings((prev) => [...prev, ...(data.warnings ?? [])]);
      setStage("report");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audit failed.");
      setStage("assumptions");
    } finally {
      window.clearInterval(interval);
    }
  }

  function restart() {
    setStage("search");
    setSearchResults([]);
    setSelectedBusiness(null);
    setAudit(null);
    setError(null);
    setWarnings([]);
    setProgressStep(0);
  }

  return (
    <>
      {stage === "search" ? (
        <>
          <HeroSearch onSearch={runSearch} searching={searching} />
          {error ? <InlineAlert message={error} tone="error" /> : null}
          <SearchResults results={searchResults} onSelect={selectBusiness} loadingId={loadingBusinessId} />
        </>
      ) : null}
      {stage === "assumptions" && selectedBusiness ? (
        <>
          {error ? <InlineAlert message={error} tone="error" /> : null}
          <AssumptionsForm business={selectedBusiness} onBack={() => setStage("search")} onSubmit={startAudit} />
        </>
      ) : null}
      {stage === "analyzing" ? <AnalyzingScreen step={progressStep} /> : null}
      {stage === "report" && audit ? <InteractiveReport audit={audit} onRestart={restart} /> : null}
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
