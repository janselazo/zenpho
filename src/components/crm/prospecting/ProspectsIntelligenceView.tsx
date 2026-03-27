"use client";

import { useCallback, useMemo, useState } from "react";
import {
  buildMarketIntelReport,
  type MarketIntelReport,
  type IntelSignals,
} from "@/lib/crm/prospect-intel-report";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import { LEAD_PROJECT_TYPE_OPTIONS } from "@/lib/crm/mock-data";
import {
  researchProspectFromUrl,
  saveProspectIntelReportAction,
  createLeadFromProspectIntelAction,
} from "@/app/(crm)/actions/prospect-intel";
import { useRouter } from "next/navigation";

const cardClass =
  "rounded-2xl border border-border bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900/60 dark:shadow-none";

function ReportPanel({ report }: { report: MarketIntelReport }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/60 dark:text-zinc-500">
          Summary
        </p>
        <p className="mt-2 text-sm leading-relaxed text-text-primary dark:text-zinc-200">
          {report.summary}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600/80 dark:text-blue-400">
            Software development
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-text-secondary dark:text-zinc-400">
            {report.software.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-600/80 dark:text-violet-400">
            AI automations
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-text-secondary dark:text-zinc-400">
            {report.aiAutomations.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600/80 dark:text-emerald-400">
            Product growth
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-text-secondary dark:text-zinc-400">
            {report.productGrowth.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </div>
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

function formatReportAsNotes(report: MarketIntelReport, extra?: string) {
  const parts = [
    extra,
    "## Software",
    ...report.software.map((s) => `- ${s}`),
    "## AI automations",
    ...report.aiAutomations.map((s) => `- ${s}`),
    "## Product growth",
    ...report.productGrowth.map((s) => `- ${s}`),
    report.summary,
  ].filter(Boolean);
  return parts.join("\n");
}

export default function ProspectsIntelligenceView() {
  const router = useRouter();
  const [textQuery, setTextQuery] = useState("");
  const [places, setPlaces] = useState<PlacesSearchPlace[]>([]);
  const [placesWarning, setPlacesWarning] = useState<string | null>(null);
  const [placesLoading, setPlacesLoading] = useState(false);

  const [urlInput, setUrlInput] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlReport, setUrlReport] = useState<MarketIntelReport | null>(null);
  const [urlMeta, setUrlMeta] = useState<{
    url: string;
    pageTitle: string | null;
    metaDescription: string | null;
  } | null>(null);

  const [placeReport, setPlaceReport] = useState<{
    place: PlacesSearchPlace;
    report: MarketIntelReport;
  } | null>(null);

  const [projectType, setProjectType] = useState<string>(LEAD_PROJECT_TYPE_OPTIONS[0]);
  const [leadName, setLeadName] = useState("");
  const [leadCompany, setLeadCompany] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadNotes, setLeadNotes] = useState("");
  const [leadPending, setLeadPending] = useState(false);
  const [leadMessage, setLeadMessage] = useState<string | null>(null);

  const [savePending, setSavePending] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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
      setLeadNotes(
        formatReportAsNotes(
          report,
          [place.formattedAddress, place.websiteUri].filter(Boolean).join("\n")
        )
      );
    },
    []
  );

  async function runPlacesSearch() {
    setPlacesLoading(true);
    setPlacesWarning(null);
    setPlaces([]);
    try {
      const res = await fetch("/api/prospecting/places-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textQuery }),
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
      const domain = (() => {
        try {
          return new URL(result.url).hostname.replace(/^www\./, "");
        } catch {
          return "";
        }
      })();
      setLeadName(result.pageTitle?.slice(0, 120) || domain);
      setLeadCompany(domain);
      setLeadNotes(formatReportAsNotes(result.report, result.url));
    } finally {
      setUrlLoading(false);
    }
  }

  function viewPlaceReport(place: PlacesSearchPlace) {
    const signals = signalsFromPlace(place);
    const report = buildMarketIntelReport(signals);
    setPlaceReport({ place, report });
    setUrlReport(null);
    setUrlMeta(null);
    syncLeadFormFromPlace(place, report);
  }

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
          Research
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-text-secondary dark:text-zinc-400">
          Research outbound targets with Google Places (official API) and quick website
          signals—then turn the best fits into CRM{" "}
          <strong className="font-medium text-text-primary dark:text-zinc-200">Leads</strong>.
          This module is separate from pipeline Leads: use it for market intelligence first.
        </p>
      </div>

      <div className={`${cardClass} space-y-4`}>
        <h2 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
          Discover businesses (Google Places)
        </h2>
        <p className="text-xs text-text-secondary dark:text-zinc-500">
          Uses the Places API (Text Search), not HTML scraping. Requires{" "}
          <code className="rounded bg-surface px-1 font-mono text-[11px] dark:bg-zinc-800">
            GOOGLE_PLACES_API_KEY
          </code>{" "}
          on the server.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={textQuery}
            onChange={(e) => setTextQuery(e.target.value)}
            placeholder='e.g. "software agencies in Austin TX"'
            className="min-w-[16rem] flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="button"
            disabled={placesLoading || !textQuery.trim()}
            onClick={() => void runPlacesSearch()}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {placesLoading ? "Searching…" : "Search"}
          </button>
        </div>
        {placesWarning ? (
          <p className="text-sm text-amber-800 dark:text-amber-200">{placesWarning}</p>
        ) : null}
        {places.length > 0 ? (
          <ul className="space-y-3">
            {places.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-2 rounded-xl border border-border p-4 dark:border-zinc-700/80 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-text-primary dark:text-zinc-100">{p.name}</p>
                  <p className="text-xs text-text-secondary dark:text-zinc-500">
                    {p.formattedAddress ?? "—"}
                    {p.rating != null
                      ? ` · ${p.rating}★ (${p.userRatingCount ?? 0} reviews)`
                      : ""}
                  </p>
                  {p.websiteUri ? (
                    <a
                      href={p.websiteUri}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block truncate text-xs text-accent hover:underline dark:text-blue-400"
                    >
                      {p.websiteUri}
                    </a>
                  ) : (
                    <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
                      No website on listing
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => viewPlaceReport(p)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface dark:border-zinc-600 dark:hover:bg-zinc-800"
                  >
                    View report
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className={`${cardClass} space-y-4`}>
        <h2 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
          Research from website URL
        </h2>
        <p className="text-xs text-text-secondary dark:text-zinc-500">
          Fetches the page safely (SSRF-limited), reads title and meta description, and
          builds a heuristic opportunity report.
        </p>
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

      {activeReport ? (
        <div className={`${cardClass} space-y-6`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h2 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
              Market intelligence report
            </h2>
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
          <ReportPanel report={activeReport.report} />
          {saveMessage ? (
            <p className="text-xs text-text-secondary dark:text-zinc-400">{saveMessage}</p>
          ) : null}

          <div className="border-t border-border pt-6 dark:border-zinc-800">
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
                  {LEAD_PROJECT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Notes (report + context)
                </label>
                <textarea
                  value={leadNotes}
                  onChange={(e) => setLeadNotes(e.target.value)}
                  rows={6}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
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
      ) : (
        <div className={`${cardClass} text-sm text-text-secondary dark:text-zinc-500`}>
          Run a Places search, click <strong className="text-text-primary dark:text-zinc-300">View report</strong>, or{" "}
          <strong className="text-text-primary dark:text-zinc-300">Research URL</strong> to
          generate a report and add a Lead.
        </div>
      )}
    </div>
  );
}
