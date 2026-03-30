"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  DEFAULT_NICHE_ID,
  INDUSTRIES,
  getNichesForIndustry,
  nicheAllowedForIndustry,
  type IndustryId,
  type LeadMagnetIdea,
  type NicheId,
} from "@/lib/crm/lead-magnet-industries";

type GenerateResponse = {
  ideas?: LeadMagnetIdea[];
  fallback?: boolean;
  warning?: string | null;
  error?: string;
};

function formatBadgeClass(format: LeadMagnetIdea["format"]): string {
  switch (format) {
    case "Calculator":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    case "Template":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400";
    case "Assessment":
      return "bg-violet-500/15 text-violet-700 dark:text-violet-400";
    case "Toolkit":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-400";
    default:
      return "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400";
  }
}

function cacheKey(industryId: IndustryId, nicheId: NicheId) {
  return `${industryId}:${nicheId}`;
}

const pillScrollerInnerClass =
  "flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

const arrowBtnClass =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-white text-text-secondary shadow-sm transition-colors hover:border-accent/30 hover:bg-surface hover:text-text-primary disabled:pointer-events-none disabled:opacity-30 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-200";

function HorizontalPillScroller({
  children,
  depKey,
  labelLeft = "Scroll left",
  labelRight = "Scroll right",
}: {
  children: React.ReactNode;
  /** Bumps scroll bounds when content width may change */
  depKey?: string;
  labelLeft?: string;
  labelRight?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanLeft(scrollLeft > 4);
    setCanRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update, depKey]);

  const scrollByDir = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const delta = Math.min(280, Math.max(160, el.clientWidth * 0.72));
    el.scrollBy({ left: dir * delta, behavior: "smooth" });
  };

  return (
    <div className="flex items-stretch gap-1.5 sm:gap-2">
      <button
        type="button"
        className={arrowBtnClass}
        aria-label={labelLeft}
        disabled={!canLeft}
        onClick={() => scrollByDir(-1)}
      >
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </button>
      <div ref={ref} className={pillScrollerInnerClass}>
        {children}
      </div>
      <button
        type="button"
        className={arrowBtnClass}
        aria-label={labelRight}
        disabled={!canRight}
        onClick={() => scrollByDir(1)}
      >
        <ChevronRight className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}

export default function LeadMagnetsView() {
  const defaultId = INDUSTRIES[0]?.id ?? "tech";
  const [industryId, setIndustryId] = useState<IndustryId>(defaultId);
  const [nicheId, setNicheId] = useState<NicheId>(DEFAULT_NICHE_ID);
  const [cache, setCache] = useState<
    Partial<
      Record<
        string,
        { ideas: LeadMagnetIdea[]; fallback: boolean; warning?: string | null }
      >
    >
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = cacheKey(industryId, nicheId);
  const current = cache[key];
  const niches = useMemo(
    () => getNichesForIndustry(industryId),
    [industryId]
  );

  const runGenerate = useCallback(
    async (opts: { useFallback?: boolean }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/lead-magnets/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            industryId,
            nicheId,
            useFallback: opts.useFallback === true,
          }),
        });
        const data = (await res.json()) as GenerateResponse;
        const ideas = Array.isArray(data.ideas) ? data.ideas : [];

        if (ideas.length === 0) {
          setError(
            data.error ?? (res.ok ? "No ideas returned." : `Request failed (${res.status}).`)
          );
          setLoading(false);
          return;
        }

        setCache((c) => ({
          ...c,
          [cacheKey(industryId, nicheId)]: {
            ideas,
            fallback: Boolean(data.fallback),
            warning: data.warning ?? data.error ?? null,
          },
        }));
        setError(null);
      } catch {
        setError("Network error. Try again.");
      } finally {
        setLoading(false);
      }
    },
    [industryId, nicheId]
  );

  const onIndustryChange = (id: IndustryId) => {
    setIndustryId(id);
    setError(null);
    setNicheId((n) => (nicheAllowedForIndustry(n, id) ? n : DEFAULT_NICHE_ID));
  };

  const onNicheChange = (id: NicheId) => {
    setNicheId(id);
    setError(null);
  };

  const intro = useMemo(
    () =>
      "Pick an industry and optional niche, then generate lead-magnet concepts using live web snippets (Reddit, Google-style results, long-tail queries) plus OpenAI — built for Zenpho’s agency pipeline.",
    []
  );

  return (
    <div>
      <h1 className="heading-display text-2xl font-bold text-text-primary dark:text-zinc-100">
        Lead magnets
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-text-secondary dark:text-zinc-400">
        {intro}
      </p>

      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary/70 dark:text-zinc-500">
          Industry
        </p>
        <div className="mt-2">
          <HorizontalPillScroller
            depKey="industries"
            labelLeft="Scroll industries left"
            labelRight="Scroll industries right"
          >
            {INDUSTRIES.map((ind) => (
              <button
                key={ind.id}
                type="button"
                onClick={() => onIndustryChange(ind.id)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  industryId === ind.id
                    ? "border-accent bg-accent/10 text-accent dark:border-blue-500 dark:bg-blue-500/15 dark:text-blue-400"
                    : "border-border bg-white text-text-secondary hover:border-accent/30 hover:text-text-primary dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
                }`}
              >
                {ind.label}
              </button>
            ))}
          </HorizontalPillScroller>
        </div>
      </div>

      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary/70 dark:text-zinc-500">
          Niche
        </p>
        <div className="mt-2">
          <HorizontalPillScroller
            depKey={`niches-${industryId}`}
            labelLeft="Scroll niches left"
            labelRight="Scroll niches right"
          >
            {niches.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => onNicheChange(n.id)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  nicheId === n.id
                    ? "border-accent bg-accent/10 text-accent dark:border-blue-500 dark:bg-blue-500/15 dark:text-blue-400"
                    : "border-border bg-white text-text-secondary hover:border-accent/30 hover:text-text-primary dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
                }`}
              >
                {n.label}
              </button>
            ))}
          </HorizontalPillScroller>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => void runGenerate({})}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          {loading ? "Generating…" : current ? "Regenerate" : "Generate ideas"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void runGenerate({ useFallback: true })}
          className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text-primary disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-200"
        >
          Load starter ideas (no API)
        </button>
      </div>

      {error ? (
        <div
          className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {current?.warning && !error ? (
        <div
          className="mt-4 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-secondary dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400"
          role="status"
        >
          {current.warning}
        </div>
      ) : null}

      {current?.fallback &&
      (!current.warning || nicheId !== DEFAULT_NICHE_ID) ? (
        <div className="mt-4 space-y-1 text-xs text-text-secondary dark:text-zinc-500">
          {!current.warning ? (
            <p>
              Showing curated starter ideas (API keys not configured or fallback
              mode).
            </p>
          ) : null}
          {nicheId !== DEFAULT_NICHE_ID ? (
            <p>
              These starters are for the <strong>whole vertical</strong>, not
              the selected niche — generate with API keys for niche-specific
              ideas.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-10">
        {loading && !current ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl border border-border bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-800/40"
              />
            ))}
          </div>
        ) : null}

        {current && !loading ? (
          <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
            {current.ideas.map((idea, idx) => (
              <li
                key={`${idea.title}-${idx}`}
                className="flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${formatBadgeClass(idea.format)}`}
                  >
                    {idea.format}
                  </span>
                </div>
                <h2 className="mt-3 text-base font-semibold text-text-primary dark:text-zinc-100">
                  {idea.title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary dark:text-zinc-400">
                  {idea.description}
                </p>
                {idea.angle ? (
                  <p className="mt-3 border-t border-border pt-3 text-xs text-text-secondary/90 dark:border-zinc-800 dark:text-zinc-500">
                    <span className="font-medium text-text-primary dark:text-zinc-400">
                      Angle:{" "}
                    </span>
                    {idea.angle}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {!loading && !current ? (
          <p className="text-sm text-text-secondary dark:text-zinc-500">
            Choose an industry and niche, then click <strong>Generate ideas</strong>{" "}
            to pull web context and synthesize concepts, or load starter ideas
            without API keys.
          </p>
        ) : null}
      </div>
    </div>
  );
}
