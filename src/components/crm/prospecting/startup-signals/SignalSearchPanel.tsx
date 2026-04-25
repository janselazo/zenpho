"use client";

import { useMemo, useState } from "react";
import {
  ExternalLink,
  Loader2,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";
import type {
  StartupSignalChannel,
  StartupSignalHit,
  StartupSignalSource,
} from "@/lib/crm/startup-signal-types";
import { TIER_PILL_COLOR } from "@/lib/crm/prospect-intel-tech-signals";
import { createLeadFromProspectIntelAction } from "@/app/(crm)/actions/prospect-intel";

type SourceOption = { id: StartupSignalSource; label: string };

const chipBase =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium";

const TIME_RANGES: { id: "day" | "week" | "month"; label: string }[] = [
  { id: "day", label: "24 hours" },
  { id: "week", label: "7 days" },
  { id: "month", label: "30 days" },
];

function FitPill({ hit }: { hit: StartupSignalHit }) {
  return (
    <span className="group relative inline-flex items-center">
      <span className={`${chipBase} ${TIER_PILL_COLOR[hit.fit.tier]}`}>
        <Sparkles className="h-3 w-3" aria-hidden />
        Fit {hit.fit.score} · {hit.fit.tier}
      </span>
      {hit.fit.breakdown.length > 0 ? (
        <span className="pointer-events-none absolute left-0 top-full z-10 mt-1 hidden w-72 rounded-lg border border-border bg-white p-2 text-[11px] text-text-secondary shadow-lg group-hover:block dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          <span className="mb-1 block font-semibold text-text-primary dark:text-zinc-100">
            Fit breakdown
          </span>
          {hit.fit.breakdown.map((b) => (
            <span key={b.label} className="flex justify-between gap-3">
              <span>{b.label}</span>
              <span className="tabular-nums">+{b.points}</span>
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}

function timeAgo(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const diff = Date.now() - t;
  const hours = diff / 3_600_000;
  if (hours < 24) return `${Math.max(1, Math.round(hours))}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function notesForHit(hit: StartupSignalHit): string {
  return [
    `Signal source: ${hit.sourceLabel}`,
    `Signal channel: ${hit.channel.replace(/_/g, " ")}`,
    hit.company ? `Company: ${hit.company}` : null,
    hit.companyDomain ? `Company domain: ${hit.companyDomain}` : null,
    hit.authorName ? `Author: ${hit.authorName}` : null,
    `Signal: ${hit.title}`,
    hit.excerpt ? `Excerpt: ${hit.excerpt.slice(0, 700)}` : null,
    `URL: ${hit.url}`,
    `Fit: ${hit.fit.score} (${hit.fit.tier})`,
    hit.fit.breakdown.length
      ? `Why: ${hit.fit.breakdown.map((b) => `${b.label} (+${b.points})`).join("; ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export default function SignalSearchPanel({
  title,
  description,
  channel,
  sourceOptions,
  defaultSources,
  defaultKeywords,
  emptyText,
}: {
  title: string;
  description: string;
  channel: StartupSignalChannel;
  sourceOptions: SourceOption[];
  defaultSources: StartupSignalSource[];
  defaultKeywords: string[];
  emptyText: string;
}) {
  const [sources, setSources] = useState<StartupSignalSource[]>(defaultSources);
  const [keywordText, setKeywordText] = useState(defaultKeywords.join(", "));
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month">("week");
  const [persist, setPersist] = useState(true);
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<StartupSignalHit[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [creatingIdx, setCreatingIdx] = useState<number | null>(null);
  const [createdIdx, setCreatedIdx] = useState<Set<number>>(new Set());
  const [createError, setCreateError] = useState<string | null>(null);

  const keywords = useMemo(
    () => keywordText.split(",").map((k) => k.trim()).filter(Boolean),
    [keywordText]
  );

  function toggleSource(source: StartupSignalSource) {
    setSources((prev) =>
      prev.includes(source) ? prev.filter((x) => x !== source) : [...prev, source]
    );
  }

  async function runSearch() {
    setLoading(true);
    setWarnings([]);
    setHits([]);
    setCreateError(null);
    setCreatedIdx(new Set());
    try {
      const res = await fetch("/api/prospecting/startup-signals/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channels: [channel],
          sources,
          keywords,
          timeRange,
          limit: 25,
          persist,
        }),
      });
      const json = (await res.json()) as {
        hits?: StartupSignalHit[];
        warnings?: { message: string }[];
        error?: string;
      };
      if (!res.ok) {
        setWarnings([json.error ?? `HTTP ${res.status}`]);
        return;
      }
      setHits(json.hits ?? []);
      setWarnings((json.warnings ?? []).map((w) => w.message));
    } catch (err) {
      setWarnings([err instanceof Error ? err.message : "Signal search failed."]);
    } finally {
      setLoading(false);
    }
  }

  async function createLead(idx: number) {
    const hit = hits[idx];
    if (!hit) return;
    setCreatingIdx(idx);
    setCreateError(null);
    try {
      const res = await createLeadFromProspectIntelAction({
        name: hit.authorName ?? hit.company ?? hit.title.slice(0, 80),
        company: hit.company ?? undefined,
        website: hit.companyDomain ? `https://${hit.companyDomain}` : undefined,
        linkedin: hit.source === "linkedin_public" || hit.source === "linkedin_activity" ? hit.url : undefined,
        notes: notesForHit(hit),
        project_type: "Web App",
        contact_category: "Tech Founder",
        source: `Prospects — ${hit.sourceLabel}`,
      });
      if ("error" in res && res.error) {
        setCreateError(res.error);
        return;
      }
      setCreatedIdx((prev) => new Set([...prev, idx]));
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create lead.");
    } finally {
      setCreatingIdx(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900/60">
        <h2 className="heading-display text-lg font-semibold text-text-primary dark:text-zinc-100">
          {title}
        </h2>
        <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
          {description}
        </p>

        <div className="mt-5">
          <p className="mb-1.5 text-xs font-medium text-text-secondary">Channels</p>
          <div className="flex flex-wrap gap-1.5">
            {sourceOptions.map((source) => {
              const on = sources.includes(source.id);
              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => toggleSource(source.id)}
                  className={`${chipBase} border ${
                    on
                      ? "border-accent bg-accent/10 text-accent dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300"
                      : "border-border text-text-secondary hover:bg-surface dark:border-zinc-700 dark:text-zinc-400"
                  }`}
                >
                  {source.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <label className="block text-xs font-medium text-text-secondary">
            Signal keywords
            <input
              value={keywordText}
              onChange={(e) => setKeywordText(e.target.value)}
              placeholder="looking for developer, seed funding, MVP"
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className="block text-xs font-medium text-text-secondary">
            Time range
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as "day" | "week" | "month")}
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {TIME_RANGES.map((range) => (
                <option key={range.id} value={range.id}>
                  {range.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={persist}
              onChange={(e) => setPersist(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border"
            />
            Save hits to monitoring history
          </label>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            disabled={loading || sources.length === 0}
            onClick={() => void runSearch()}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
            {loading ? "Searching…" : "Search signals"}
          </button>
          {hits.length ? (
            <span className="text-xs text-text-secondary dark:text-zinc-500">
              {hits.length} signal{hits.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        {warnings.length > 0 ? (
          <div className="mt-3 space-y-2">
            {warnings.map((warning, idx) => (
              <p
                key={`${warning}-${idx}`}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
              >
                {warning}
              </p>
            ))}
          </div>
        ) : null}
        {createError ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {createError}
          </p>
        ) : null}
      </div>

      {hits.length === 0 && !loading ? (
        <div className="rounded-2xl border border-dashed border-border bg-white/50 p-8 text-center text-sm text-text-secondary dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-500">
          {emptyText}
        </div>
      ) : null}

      <ul className="space-y-3">
        {hits.map((hit, idx) => {
          const when = timeAgo(hit.postedAt);
          return (
            <li
              key={`${hit.source}-${hit.sourceItemId}-${idx}`}
              className="rounded-2xl border border-border bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900/60"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`${chipBase} bg-surface text-text-secondary dark:bg-zinc-800/60 dark:text-zinc-400`}>
                      {hit.sourceLabel}
                    </span>
                    <FitPill hit={hit} />
                    {hit.fit.intentKeys.map((intent) => (
                      <span
                        key={intent}
                        className={`${chipBase} bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300`}
                      >
                        {intent.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                  <a
                    href={hit.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block text-sm font-semibold text-text-primary hover:underline dark:text-zinc-100"
                  >
                    {hit.title}
                  </a>
                  {hit.excerpt ? (
                    <p className="mt-1 line-clamp-3 text-sm text-text-secondary dark:text-zinc-400">
                      {hit.excerpt}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary dark:text-zinc-500">
                    {hit.authorName ? (
                      <span className="inline-flex items-center gap-1">
                        <UserRound className="h-3 w-3" aria-hidden />
                        {hit.authorName}
                      </span>
                    ) : null}
                    {hit.company ? <span>{hit.company}</span> : null}
                    {hit.companyDomain ? <span>{hit.companyDomain}</span> : null}
                    {when ? <span>{when}</span> : null}
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:w-44">
                  <button
                    type="button"
                    disabled={creatingIdx === idx || createdIdx.has(idx)}
                    onClick={() => void createLead(idx)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
                  >
                    {creatingIdx === idx ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                    {createdIdx.has(idx)
                      ? "Lead created"
                      : creatingIdx === idx
                        ? "Creating…"
                        : "Create Lead"}
                  </button>
                  <a
                    href={hit.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-primary hover:bg-surface dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    Open signal
                  </a>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
