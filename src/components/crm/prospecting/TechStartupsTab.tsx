"use client";

import { useState } from "react";
import {
  ExternalLink,
  Linkedin,
  Loader2,
  MessagesSquare,
  Rocket,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import IconTabBar from "@/components/crm/prospecting/IconTabBar";
import RedditCommunitiesTab from "@/components/crm/prospecting/RedditCommunitiesTab";
import type {
  ApolloPersonRow,
  TechStartupOrgRow,
} from "@/lib/crm/prospect-enrichment-types";
import type { StackFingerprint } from "@/lib/crm/tech-stack-fingerprint";
import {
  stackLabel,
  type StackKind,
} from "@/lib/crm/tech-stack-fingerprint";
import {
  STACK_KIND_PILL_COLOR,
  TIER_PILL_COLOR,
  type TechFitScore,
} from "@/lib/crm/prospect-intel-tech-signals";
import { createLeadFromProspectIntelAction } from "@/app/(crm)/actions/prospect-intel";

type TechStartupResult = {
  org: TechStartupOrgRow;
  stack: StackFingerprint;
  fit: TechFitScore;
  founders: ApolloPersonRow[];
};

const EMPLOYEE_RANGES: { id: string; label: string }[] = [
  { id: "1,10", label: "1–10" },
  { id: "11,50", label: "11–50" },
  { id: "51,200", label: "51–200" },
  { id: "201,500", label: "201–500" },
];

const FUNDING_STAGES: { id: string; label: string }[] = [
  { id: "pre_seed", label: "Pre-seed" },
  { id: "seed", label: "Seed" },
  { id: "series_a", label: "Series A" },
  { id: "series_b", label: "Series B" },
  { id: "series_c", label: "Series C" },
];

const INDUSTRY_PRESETS = [
  "SaaS",
  "Fintech",
  "AI",
  "Marketplace",
  "DevTools",
  "Healthtech",
  "Edtech",
];

const chipBase =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium";

function FitPill({ fit }: { fit: TechFitScore }) {
  const color = TIER_PILL_COLOR[fit.tier];
  return (
    <span className="group relative inline-flex items-center">
      <span className={`${chipBase} ${color}`}>
        <Sparkles className="h-3 w-3" aria-hidden />
        Fit {fit.score} · {fit.tier}
      </span>
      {fit.breakdown.length > 0 ? (
        <span className="pointer-events-none absolute left-0 top-full z-10 mt-1 hidden w-64 rounded-lg border border-border bg-white p-2 text-[11px] text-text-secondary shadow-lg group-hover:block dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          <span className="mb-1 block font-semibold text-text-primary dark:text-zinc-100">
            Fit breakdown
          </span>
          {fit.breakdown.map((b) => (
            <span key={b.label} className="flex justify-between">
              <span>{b.label}</span>
              <span className="tabular-nums">+{b.points}</span>
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}

function StackPill({ stack }: { stack: StackFingerprint }) {
  const kind: StackKind = stack.kind;
  return (
    <span
      className={`${chipBase} ${STACK_KIND_PILL_COLOR[kind]}`}
      title={stack.evidence.join(" · ") || undefined}
    >
      {stackLabel(kind)}
      {stack.isNoCode ? " · no-code" : ""}
    </span>
  );
}

function FounderChip({ p }: { p: ApolloPersonRow }) {
  const linked = p.linkedinUrl?.trim();
  const body = (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[11px] text-text-primary dark:border-zinc-700 dark:text-zinc-200">
      <Linkedin className="h-3 w-3 text-[#0A66C2]" aria-hidden />
      <span className="truncate max-w-[9rem]">{p.name}</span>
      {p.title ? (
        <span className="truncate max-w-[8rem] text-text-secondary dark:text-zinc-500">
          · {p.title}
        </span>
      ) : null}
    </span>
  );
  return linked ? (
    <a
      href={linked}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:opacity-80"
    >
      {body}
    </a>
  ) : (
    body
  );
}

function formatFunding(org: TechStartupOrgRow): string | null {
  const stage = org.latestFundingStage
    ? org.latestFundingStage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : null;
  const amount = org.latestFundingAmount
    ? `$${(org.latestFundingAmount / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
    : null;
  if (stage && amount) return `${stage} · ${amount}`;
  return stage ?? amount;
}

function tidyDomain(org: TechStartupOrgRow): string | null {
  const d = org.domain ?? org.websiteUrl;
  if (!d) return null;
  return d.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
}

type TechStartupsSubTab = "companies" | "reddit";

export default function TechStartupsTab() {
  const [subTab, setSubTab] = useState<TechStartupsSubTab>("companies");
  const [keyword, setKeyword] = useState("");
  const [industries, setIndustries] = useState<string[]>([]);
  const [employeeRanges, setEmployeeRanges] = useState<string[]>(["1,10", "11,50"]);
  const [fundingStages, setFundingStages] = useState<string[]>(["seed", "series_a"]);
  const [location, setLocation] = useState("");
  const [noCodeOnly, setNoCodeOnly] = useState(false);
  const [foundersOnly, setFoundersOnly] = useState(true);

  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [results, setResults] = useState<TechStartupResult[]>([]);
  const [creatingIdx, setCreatingIdx] = useState<number | null>(null);
  const [createdIdx, setCreatedIdx] = useState<Set<number>>(new Set());
  const [createError, setCreateError] = useState<string | null>(null);

  function toggle(list: string[], val: string, setter: (v: string[]) => void) {
    setter(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);
  }

  async function runSearch() {
    setLoading(true);
    setWarning(null);
    setResults([]);
    setCreatedIdx(new Set());
    setCreateError(null);
    try {
      const body = {
        keyword: keyword.trim() || undefined,
        industries: industries.length ? industries : undefined,
        employeeRanges: employeeRanges.length ? employeeRanges : undefined,
        fundingStages: fundingStages.length ? fundingStages : undefined,
        locations: location.trim() ? [location.trim()] : undefined,
        includeFounders: foundersOnly,
        linkedinFoundersOnly: foundersOnly,
        limit: 25,
      };
      const res = await fetch("/api/prospecting/tech-startups-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        results?: TechStartupResult[];
        error?: string;
        warning?: string;
      };
      if (!res.ok) {
        setWarning(json.error ?? `HTTP ${res.status}`);
        return;
      }
      if (json.warning) setWarning(json.warning);
      let rows = json.results ?? [];
      if (noCodeOnly) rows = rows.filter((r) => r.stack.isNoCode);
      setResults(rows);
    } catch (e) {
      setWarning(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  async function createLeadFromResult(idx: number) {
    const r = results[idx];
    if (!r) return;
    setCreatingIdx(idx);
    setCreateError(null);
    try {
      const founder = r.founders[0];
      const stageLabel = r.org.latestFundingStage
        ? r.org.latestFundingStage.replace(/_/g, " ")
        : null;
      const notesLines = [
        `Company: ${r.org.name}${r.org.industry ? ` · ${r.org.industry}` : ""}`,
        r.org.employeeCount != null ? `Employees: ${r.org.employeeCount}` : null,
        r.org.foundedYear ? `Founded: ${r.org.foundedYear}` : null,
        stageLabel ? `Funding: ${stageLabel}` : null,
        `Stack: ${stackLabel(r.stack.kind)}${r.stack.isNoCode ? " (no-code)" : ""}`,
        `Fit: ${r.fit.score} (${r.fit.tier})`,
        r.fit.breakdown.length
          ? `Why: ${r.fit.breakdown.map((b) => `${b.label} (+${b.points})`).join("; ")}`
          : null,
      ].filter(Boolean) as string[];

      const res = await createLeadFromProspectIntelAction({
        name: founder?.name?.trim() || r.org.name,
        company: r.org.name,
        website: r.org.websiteUrl ?? (r.org.domain ? `https://${r.org.domain}` : undefined),
        linkedin: founder?.linkedinUrl ?? r.org.linkedinUrl ?? undefined,
        notes: notesLines.join("\n"),
        project_type: "Web App",
        contact_category: "Tech Founder",
        source: "Prospects — Tech Startups",
      });

      if ("error" in res && res.error) {
        setCreateError(res.error);
        return;
      }
      setCreatedIdx((s) => new Set([...s, idx]));
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Could not create lead.");
    } finally {
      setCreatingIdx(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-text-secondary dark:text-zinc-500">
        Discover tech founders via Apollo company data or Reddit community intent — both
        score leads for a custom web app pitch.
      </p>
      <IconTabBar
        tabs={[
          { id: "tech-startups-companies", label: "Companies", icon: Rocket },
          { id: "tech-startups-reddit", label: "Reddit Communities", icon: MessagesSquare },
        ]}
        activeTab={
          subTab === "companies" ? "tech-startups-companies" : "tech-startups-reddit"
        }
        onTabChange={(id) =>
          setSubTab(id === "tech-startups-reddit" ? "reddit" : "companies")
        }
        ariaLabel="Tech Startups sources"
      />

      <div
        id="tech-startups-reddit-panel"
        role="tabpanel"
        aria-labelledby="tech-startups-reddit-tab"
        hidden={subTab !== "reddit"}
      >
        <RedditCommunitiesTab embedded />
      </div>

      <div
        id="tech-startups-companies-panel"
        role="tabpanel"
        aria-labelledby="tech-startups-companies-tab"
        hidden={subTab !== "companies"}
      >
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900/60">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-accent dark:text-blue-400" aria-hidden />
          <h2 className="heading-display text-lg font-semibold text-text-primary dark:text-zinc-100">
            Companies (Apollo)
          </h2>
        </div>
        <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
          Apollo-backed org search plus a website tech-stack fingerprint. Companies with
          no-code landing pages, early-stage funding, or visible founders score higher —
          great fits for a custom web app pitch.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-text-secondary">
            Keyword / product
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. CRM, dev tools, productivity"
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="block text-xs font-medium text-text-secondary">
            Location (country or city)
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. United States, Berlin"
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
        </div>

        <div className="mt-4">
          <p className="mb-1.5 text-xs font-medium text-text-secondary">Industries</p>
          <div className="flex flex-wrap gap-1.5">
            {INDUSTRY_PRESETS.map((ind) => {
              const on = industries.includes(ind);
              return (
                <button
                  key={ind}
                  type="button"
                  onClick={() => toggle(industries, ind, setIndustries)}
                  className={`${chipBase} border ${
                    on
                      ? "border-accent bg-accent/10 text-accent dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300"
                      : "border-border text-text-secondary hover:bg-surface dark:border-zinc-700 dark:text-zinc-400"
                  }`}
                >
                  {ind}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-medium text-text-secondary">Employees</p>
            <div className="flex flex-wrap gap-1.5">
              {EMPLOYEE_RANGES.map((r) => {
                const on = employeeRanges.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggle(employeeRanges, r.id, setEmployeeRanges)}
                    className={`${chipBase} border ${
                      on
                        ? "border-accent bg-accent/10 text-accent dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300"
                        : "border-border text-text-secondary hover:bg-surface dark:border-zinc-700 dark:text-zinc-400"
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-text-secondary">Funding stage</p>
            <div className="flex flex-wrap gap-1.5">
              {FUNDING_STAGES.map((s) => {
                const on = fundingStages.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(fundingStages, s.id, setFundingStages)}
                    className={`${chipBase} border ${
                      on
                        ? "border-accent bg-accent/10 text-accent dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300"
                        : "border-border text-text-secondary hover:bg-surface dark:border-zinc-700 dark:text-zinc-400"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={noCodeOnly}
              onChange={(e) => setNoCodeOnly(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border"
            />
            No-code landing page only
          </label>
          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={foundersOnly}
              onChange={(e) => setFoundersOnly(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border"
            />
            Founder on LinkedIn only
            <span
              className="ml-1 text-[10px] text-text-secondary/70 dark:text-zinc-500"
              title="Chains Apollo People Search per company; consumes extra credits."
            >
              (costs credits)
            </span>
          </label>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => void runSearch()}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Search className="h-4 w-4" aria-hidden />
            )}
            {loading ? "Searching…" : "Search startups"}
          </button>
          {results.length > 0 ? (
            <span className="text-xs text-text-secondary dark:text-zinc-500">
              {results.length} result{results.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        {warning ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            {warning}
          </p>
        ) : null}
        {createError ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {createError}
          </p>
        ) : null}
      </div>

      {results.length === 0 && !loading ? (
        <div className="rounded-2xl border border-dashed border-border bg-white/50 p-8 text-center text-sm text-text-secondary dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-500">
          Pick filters and click <strong className="text-text-primary dark:text-zinc-200">Search startups</strong> to pull
          companies from Apollo. We fingerprint their site and score each row for
          &ldquo;build them a custom web app&rdquo; fit.
        </div>
      ) : null}

      <ul className="space-y-3">
        {results.map((r, idx) => {
          const domain = tidyDomain(r.org);
          const funding = formatFunding(r.org);
          const placeParts = [r.org.city, r.org.country].filter(Boolean).join(", ");
          return (
            <li
              key={`${r.org.apolloOrgId ?? r.org.domain ?? idx}-${idx}`}
              className="rounded-2xl border border-border bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900/60"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="heading-display text-base font-semibold text-text-primary dark:text-zinc-100">
                      {r.org.name}
                    </h3>
                    <FitPill fit={r.fit} />
                    <StackPill stack={r.stack} />
                    {r.org.industry ? (
                      <span className={`${chipBase} bg-surface text-text-secondary dark:bg-zinc-800/60 dark:text-zinc-400`}>
                        {r.org.industry}
                      </span>
                    ) : null}
                  </div>
                  {r.org.shortDescription ? (
                    <p className="mt-1 line-clamp-2 text-sm text-text-secondary dark:text-zinc-400">
                      {r.org.shortDescription}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary dark:text-zinc-500">
                    {domain ? (
                      <a
                        href={r.org.websiteUrl ?? `https://${r.org.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-accent hover:underline dark:text-blue-400"
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden />
                        {domain}
                      </a>
                    ) : null}
                    {r.org.employeeCount != null ? (
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" aria-hidden />
                        {r.org.employeeCount}
                      </span>
                    ) : null}
                    {r.org.foundedYear ? <span>Founded {r.org.foundedYear}</span> : null}
                    {funding ? <span>{funding}</span> : null}
                    {placeParts ? <span>{placeParts}</span> : null}
                    {r.org.openJobsCount != null && r.org.openJobsCount > 0 ? (
                      <span>
                        Hiring · {r.org.openJobsCount} open
                      </span>
                    ) : null}
                  </div>
                  {r.founders.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.founders.slice(0, 3).map((p, i) => (
                        <FounderChip key={`${p.apolloPersonId ?? p.name}-${i}`} p={p} />
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2 sm:w-48">
                  <button
                    type="button"
                    disabled={creatingIdx === idx || createdIdx.has(idx)}
                    onClick={() => void createLeadFromResult(idx)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
                  >
                    {creatingIdx === idx ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : null}
                    {createdIdx.has(idx)
                      ? "Lead created"
                      : creatingIdx === idx
                        ? "Creating…"
                        : "Create Lead"}
                  </button>
                  {r.org.linkedinUrl ? (
                    <a
                      href={r.org.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-primary hover:bg-surface dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      <Linkedin className="h-3.5 w-3.5" aria-hidden />
                      Company LinkedIn
                    </a>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
      </div>
    </div>
  );
}
