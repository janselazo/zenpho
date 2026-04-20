"use client";

import { useMemo, useState } from "react";
import {
  ExternalLink,
  Loader2,
  MessagesSquare,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import {
  INTENT_PRESETS,
  describeIntent,
  type IntentKey,
  type RedditFitScore,
} from "@/lib/crm/reddit-intent-signals";
import { TIER_PILL_COLOR } from "@/lib/crm/prospect-intel-tech-signals";
import type { RedditPost, RedditUserAbout } from "@/lib/integrations/reddit";
import { createLeadFromProspectIntelAction } from "@/app/(crm)/actions/prospect-intel";

type RedditSearchResult = {
  post: RedditPost;
  author: RedditUserAbout | null;
  fit: RedditFitScore;
};

const DEFAULT_SUBREDDITS = [
  "SaaS",
  "startups",
  "indiehackers",
  "SideProject",
  "Entrepreneur",
  "EntrepreneurRideAlong",
];

const TIME_RANGES: { id: "day" | "week" | "month" | "year"; label: string }[] = [
  { id: "day", label: "24 hours" },
  { id: "week", label: "7 days" },
  { id: "month", label: "30 days" },
  { id: "year", label: "1 year" },
];

const SORTS: { id: "new" | "relevance" | "top" | "hot"; label: string }[] = [
  { id: "new", label: "New" },
  { id: "relevance", label: "Relevance" },
  { id: "top", label: "Top" },
  { id: "hot", label: "Hot" },
];

const chipBase =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium";

function FitPill({ fit }: { fit: RedditFitScore }) {
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

function timeAgo(utcSeconds: number): string {
  if (!utcSeconds) return "";
  const diff = Date.now() / 1000 - utcSeconds;
  if (diff < 3600) return `${Math.max(1, Math.round(diff / 60))}m ago`;
  if (diff < 86_400) return `${Math.round(diff / 3600)}h ago`;
  if (diff < 86_400 * 30) return `${Math.round(diff / 86_400)}d ago`;
  return `${Math.round(diff / 86_400 / 30)}mo ago`;
}

function pickAuthorWebsite(r: RedditSearchResult): string | null {
  const desc = r.author?.profileDescription ?? "";
  const m = desc.match(/https?:\/\/[^\s<>\]"']+/i);
  if (m) return m[0];
  return r.post.externalUrls[0] ?? null;
}

export default function RedditCommunitiesTab({
  embedded = false,
}: {
  /** When true, hides the large page-style title row (used inside Tech Startups). */
  embedded?: boolean;
}) {
  const [subreddits, setSubreddits] = useState<string[]>(["SaaS", "indiehackers"]);
  const [customSub, setCustomSub] = useState("");
  const [query, setQuery] = useState("");
  const [intents, setIntents] = useState<IntentKey[]>(["needs_dev", "no_code_built"]);
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month" | "year">("week");
  const [sort, setSort] = useState<"new" | "relevance" | "top" | "hot">("new");
  const [enrichAuthors, setEnrichAuthors] = useState(false);

  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [results, setResults] = useState<RedditSearchResult[]>([]);
  const [creatingIdx, setCreatingIdx] = useState<number | null>(null);
  const [createdIdx, setCreatedIdx] = useState<Set<number>>(new Set());
  const [createError, setCreateError] = useState<string | null>(null);

  const subredditOptions = useMemo(() => {
    const set = new Set<string>([...DEFAULT_SUBREDDITS, ...subreddits]);
    return [...set];
  }, [subreddits]);

  function toggleSub(name: string) {
    setSubreddits((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  }

  function addCustomSub() {
    const clean = customSub.trim().replace(/^r\//i, "");
    if (!clean) return;
    if (!subreddits.includes(clean)) setSubreddits([...subreddits, clean]);
    setCustomSub("");
  }

  function toggleIntent(key: IntentKey) {
    setIntents((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  }

  async function runSearch() {
    setLoading(true);
    setWarning(null);
    setResults([]);
    setCreatedIdx(new Set());
    setCreateError(null);
    try {
      const res = await fetch("/api/prospecting/reddit-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subreddits,
          query: query.trim() || undefined,
          intents,
          timeRange,
          sort,
          enrichAuthors,
          limit: 25,
        }),
      });
      const json = (await res.json()) as {
        results?: RedditSearchResult[];
        error?: string;
        warning?: string;
      };
      if (!res.ok) {
        setWarning(json.error ?? `HTTP ${res.status}`);
        return;
      }
      if (json.warning) setWarning(json.warning);
      setResults(json.results ?? []);
    } catch (e) {
      setWarning(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  }

  async function createLeadFromPost(idx: number) {
    const r = results[idx];
    if (!r) return;
    setCreatingIdx(idx);
    setCreateError(null);
    try {
      const website = pickAuthorWebsite(r);
      const intentLabels = r.fit.intents.map(describeIntent).join(", ");
      const excerpt = r.post.selftext.slice(0, 400).replace(/\s+/g, " ").trim();
      const notes = [
        `Subreddit: r/${r.post.subreddit}`,
        `Post: ${r.post.title}`,
        `Reddit permalink: ${r.post.permalink}`,
        r.post.author && r.post.author !== "[deleted]"
          ? `Reddit author: u/${r.post.author}`
          : null,
        intentLabels ? `Intents: ${intentLabels}` : null,
        `Fit: ${r.fit.score} (${r.fit.tier})`,
        r.fit.breakdown.length
          ? `Why: ${r.fit.breakdown.map((b) => `${b.label} (+${b.points})`).join("; ")}`
          : null,
        excerpt ? `\nExcerpt: ${excerpt}${r.post.selftext.length > 400 ? "…" : ""}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const displayName =
        r.post.author && r.post.author !== "[deleted]"
          ? `u/${r.post.author}`
          : r.post.title.slice(0, 80);

      const res = await createLeadFromProspectIntelAction({
        name: displayName,
        website: website ?? undefined,
        notes,
        project_type: "Web App",
        contact_category: "Tech Founder",
        source: "Prospects — Reddit",
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
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900/60">
        {embedded ? (
          <h2 className="sr-only">Reddit Communities</h2>
        ) : (
          <div className="flex items-center gap-2">
            <MessagesSquare className="h-5 w-5 text-accent dark:text-blue-400" aria-hidden />
            <h2 className="heading-display text-lg font-semibold text-text-primary dark:text-zinc-100">
              Reddit Communities
            </h2>
          </div>
        )}
        <p className={`text-xs text-text-secondary dark:text-zinc-500 ${embedded ? "" : "mt-1"}`}>
          Search founder-heavy subreddits with intent presets (needs dev, shipped on no-code,
          early MVP). Posts with strong intent + recent + engaging score higher. Enrich
          authors to add karma and profile URL to the score.
        </p>

        <div className="mt-5">
          <p className="mb-1.5 text-xs font-medium text-text-secondary">Subreddits</p>
          <div className="flex flex-wrap gap-1.5">
            {subredditOptions.map((s) => {
              const on = subreddits.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSub(s)}
                  className={`${chipBase} border ${
                    on
                      ? "border-accent bg-accent/10 text-accent dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300"
                      : "border-border text-text-secondary hover:bg-surface dark:border-zinc-700 dark:text-zinc-400"
                  }`}
                >
                  r/{s}
                  {on ? <X className="h-3 w-3" aria-hidden /> : null}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              value={customSub}
              onChange={(e) => setCustomSub(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomSub();
                }
              }}
              placeholder="Add a subreddit (e.g. microsaas)"
              className="flex-1 rounded-lg border border-border bg-white px-3 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              type="button"
              onClick={addCustomSub}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Add
            </button>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-1.5 text-xs font-medium text-text-secondary">Intent presets</p>
          <div className="flex flex-wrap gap-1.5">
            {INTENT_PRESETS.map((preset) => {
              const on = intents.includes(preset.key);
              return (
                <button
                  key={preset.key}
                  type="button"
                  title={preset.description}
                  onClick={() => toggleIntent(preset.key)}
                  className={`${chipBase} border ${
                    on
                      ? "border-accent bg-accent/10 text-accent dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300"
                      : "border-border text-text-secondary hover:bg-surface dark:border-zinc-700 dark:text-zinc-400"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-text-secondary">
            Keyword (optional)
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. looking for a dev, built with framer"
              className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-text-secondary">
              Time range
              <select
                value={timeRange}
                onChange={(e) =>
                  setTimeRange(e.target.value as "day" | "week" | "month" | "year")
                }
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {TIME_RANGES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-text-secondary">
              Sort
              <select
                value={sort}
                onChange={(e) =>
                  setSort(e.target.value as "new" | "relevance" | "top" | "hot")
                }
                className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={enrichAuthors}
              onChange={(e) => setEnrichAuthors(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-border"
            />
            Enrich authors (karma + profile URL)
            <span
              className="ml-1 text-[10px] text-text-secondary/70 dark:text-zinc-500"
              title="Adds one Reddit API call per top author. Slower, better scoring."
            >
              (slower)
            </span>
          </label>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            disabled={loading || subreddits.length === 0}
            onClick={() => void runSearch()}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Search className="h-4 w-4" aria-hidden />
            )}
            {loading ? "Searching…" : "Search posts"}
          </button>
          {results.length > 0 ? (
            <span className="text-xs text-text-secondary dark:text-zinc-500">
              {results.length} post{results.length === 1 ? "" : "s"}
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
          Pick subreddits and intent presets, then click <strong className="text-text-primary dark:text-zinc-200">Search posts</strong>.
          We score each post for founders open to a custom web app build.
        </div>
      ) : null}

      <ul className="space-y-3">
        {results.map((r, idx) => {
          const excerpt = r.post.selftext
            ? r.post.selftext.slice(0, 280).replace(/\s+/g, " ").trim()
            : null;
          const website = pickAuthorWebsite(r);
          return (
            <li
              key={r.post.id}
              className="rounded-2xl border border-border bg-white p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900/60"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`${chipBase} bg-surface text-text-secondary dark:bg-zinc-800/60 dark:text-zinc-400`}>
                      r/{r.post.subreddit}
                    </span>
                    <FitPill fit={r.fit} />
                    {r.post.linkFlairText ? (
                      <span
                        className={`${chipBase} bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300`}
                      >
                        {r.post.linkFlairText}
                      </span>
                    ) : null}
                    {r.fit.intents.map((k) => (
                      <span
                        key={k}
                        className={`${chipBase} bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300`}
                      >
                        {describeIntent(k)}
                      </span>
                    ))}
                  </div>
                  <a
                    href={r.post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block text-sm font-semibold text-text-primary hover:underline dark:text-zinc-100"
                  >
                    {r.post.title}
                  </a>
                  {excerpt ? (
                    <p className="mt-1 line-clamp-3 text-sm text-text-secondary dark:text-zinc-400">
                      {excerpt}
                      {r.post.selftext.length > 280 ? "…" : ""}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary dark:text-zinc-500">
                    {r.post.author && r.post.author !== "[deleted]" ? (
                      <a
                        href={`https://www.reddit.com/user/${r.post.author}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        <UserRound className="h-3 w-3" aria-hidden />
                        u/{r.post.author}
                        {r.author?.totalKarma != null
                          ? ` · ${r.author.totalKarma.toLocaleString()} karma`
                          : ""}
                      </a>
                    ) : (
                      <span>[deleted]</span>
                    )}
                    <span>{timeAgo(r.post.createdUtc)}</span>
                    <span>{r.post.score} pts</span>
                    <span>{r.post.numComments} comments</span>
                    {website ? (
                      <a
                        href={website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-accent hover:underline dark:text-blue-400"
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden />
                        {website.replace(/^https?:\/\//i, "").replace(/\/$/, "").slice(0, 48)}
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:w-44">
                  <button
                    type="button"
                    disabled={creatingIdx === idx || createdIdx.has(idx)}
                    onClick={() => void createLeadFromPost(idx)}
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
                  <a
                    href={r.post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-primary hover:bg-surface dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    Open post
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
