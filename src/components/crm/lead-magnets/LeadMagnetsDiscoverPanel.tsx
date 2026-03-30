"use client";

import { useCallback, useMemo, useState } from "react";
import { Bookmark, Lightbulb, Loader2 } from "lucide-react";
import {
  INDUSTRIES,
  defaultNicheForIndustry,
  getNichesForIndustry,
  nicheAllowedForIndustry,
  type IndustryId,
  type LeadMagnetIdea,
  type NicheId,
} from "@/lib/crm/lead-magnet-industries";
import { saveLeadMagnetFromIdea } from "@/app/(crm)/actions/saved-lead-magnets";
import { formatBadgeClass } from "@/components/crm/lead-magnets/lead-magnet-card-styles";
import { HorizontalPillScroller } from "@/components/crm/lead-magnets/lead-magnets-scroll";

type GenerateResponse = {
  ideas?: LeadMagnetIdea[];
  fallback?: boolean;
  warning?: string | null;
  error?: string;
};

function cacheKey(industryId: IndustryId, nicheId: NicheId) {
  return `${industryId}:${nicheId}`;
}

type Props = {
  onSaved: () => void;
};

export default function LeadMagnetsDiscoverPanel({ onSaved }: Props) {
  const defaultId = INDUSTRIES[0]?.id ?? "tech";
  const [industryId, setIndustryId] = useState<IndustryId>(defaultId);
  const [nicheId, setNicheId] = useState<NicheId>(() =>
    defaultNicheForIndustry(defaultId)
  );
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
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const key = cacheKey(industryId, nicheId);
  const current = cache[key];
  const niches = useMemo(
    () => getNichesForIndustry(industryId),
    [industryId]
  );

  const industryLabel = useMemo(
    () => INDUSTRIES.find((i) => i.id === industryId)?.label ?? industryId,
    [industryId]
  );
  const nicheLabel = useMemo(
    () => niches.find((n) => n.id === nicheId)?.label ?? nicheId,
    [niches, nicheId]
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
    setNicheId((n) =>
      nicheAllowedForIndustry(n, id) ? n : defaultNicheForIndustry(id)
    );
  };

  const onNicheChange = (id: NicheId) => {
    setNicheId(id);
    setError(null);
  };

  const saveIdea = async (idea: LeadMagnetIdea, idx: number) => {
    const sk = `${key}:${idx}:${idea.title}`;
    setSavingKey(sk);
    setSaveMsg(null);
    const res = await saveLeadMagnetFromIdea({
      industryId,
      nicheId,
      idea,
    });
    setSavingKey(null);
    if (!res.ok) {
      setSaveMsg(res.error);
      return;
    }
    setSaveMsg("Saved to Saved tab.");
    onSaved();
    setTimeout(() => setSaveMsg(null), 2500);
  };

  return (
    <div className="space-y-8">
      <section
        aria-labelledby="lm-scope-heading"
        className="rounded-2xl border border-border bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40 sm:p-6"
      >
        <div className="flex flex-col gap-6">
          <header className="space-y-1">
            <h2
              id="lm-scope-heading"
              className="text-sm font-semibold text-text-primary dark:text-zinc-100"
            >
              Scope
            </h2>
            <p className="text-xs leading-relaxed text-text-secondary dark:text-zinc-500">
              Choose the vertical and audience. Pills scroll sideways; use the
              arrows if your pick is off-screen.
            </p>
          </header>

          <div>
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
                    className={`snap-start shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      industryId === ind.id
                        ? "border-accent bg-accent/10 text-accent ring-2 ring-accent/20 dark:border-blue-500 dark:bg-blue-500/15 dark:text-blue-400 dark:ring-blue-500/25"
                        : "border-border bg-white text-text-secondary hover:border-accent/30 hover:text-text-primary dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
                    }`}
                  >
                    {ind.label}
                  </button>
                ))}
              </HorizontalPillScroller>
            </div>
          </div>

          <div>
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
                    className={`snap-start shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      nicheId === n.id
                        ? "border-accent bg-accent/10 text-accent ring-2 ring-accent/20 dark:border-blue-500 dark:bg-blue-500/15 dark:text-blue-400 dark:ring-blue-500/25"
                        : "border-border bg-white text-text-secondary hover:border-accent/30 hover:text-text-primary dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
                    }`}
                  >
                    {n.label}
                  </button>
                ))}
              </HorizontalPillScroller>
            </div>
          </div>

          <div className="border-t border-border pt-5 dark:border-zinc-800/80">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary/70 dark:text-zinc-500">
              Generate for
            </p>
            <p className="mt-2 text-sm font-medium text-text-primary dark:text-zinc-100">
              <span className="text-text-primary dark:text-zinc-100">
                {industryLabel}
              </span>
              <span
                className="mx-2 text-text-secondary/40 dark:text-zinc-600"
                aria-hidden
              >
                ·
              </span>
              <span className="text-text-primary dark:text-zinc-100">
                {nicheLabel}
              </span>
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                disabled={loading}
                aria-busy={loading}
                onClick={() => void runGenerate({})}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto sm:min-w-[9rem] dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                ) : null}
                {loading
                  ? current
                    ? "Refreshing…"
                    : "Generating…"
                  : current
                    ? "Regenerate"
                    : "Generate ideas"}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void runGenerate({ useFallback: true })}
                className="flex w-full flex-col items-stretch rounded-lg border border-border bg-white px-3 py-2 text-left transition-colors hover:bg-surface disabled:opacity-50 sm:w-auto sm:min-w-[10rem] dark:border-zinc-700 dark:bg-zinc-950/50 dark:hover:bg-zinc-800/60"
              >
                <span className="text-xs font-semibold text-text-primary dark:text-zinc-200">
                  Sample ideas
                </span>
                <span className="mt-0.5 text-[11px] font-normal leading-snug text-text-secondary dark:text-zinc-500">
                  Curated starters, no API keys
                </span>
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-text-secondary dark:text-zinc-500">
              <strong className="font-medium text-text-primary/90 dark:text-zinc-400">
                Generate ideas
              </strong>{" "}
              uses live context when keys are configured. Use{" "}
              <strong className="font-medium text-text-primary/90 dark:text-zinc-400">
                Sample ideas
              </strong>{" "}
              to preview the flow anytime.
            </p>
          </div>
        </div>
      </section>

      {saveMsg ? (
        <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400" role="status">
          {saveMsg}
        </p>
      ) : null}

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

      {current?.fallback ? (
        <div className="mt-4 space-y-1 text-xs text-text-secondary dark:text-zinc-500">
          {!current.warning ? (
            <p>
              Showing curated starter ideas (API keys not configured or fallback
              mode).
            </p>
          ) : null}
          <p>
            These starters match the <strong>industry</strong>, not the selected
            niche — generate with API keys for niche-specific ideas.
          </p>
        </div>
      ) : null}

      <div>
        {loading && current ? (
          <p
            className="mb-4 flex items-center gap-2 text-sm text-text-secondary dark:text-zinc-400"
            aria-live="polite"
          >
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent dark:text-blue-400" aria-hidden />
            Updating ideas — your previous set stays below until the new one is ready.
          </p>
        ) : null}

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

        {current ? (
          <ul
            className={`grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3 ${
              loading ? "pointer-events-none opacity-60 saturate-75" : ""
            }`}
            aria-busy={loading}
          >
            {current.ideas.map((idea, idx) => {
              const sk = `${key}:${idx}:${idea.title}`;
              const busy = savingKey === sk;
              return (
                <li
                  key={`${idea.title}-${idx}`}
                  className="relative flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${formatBadgeClass(idea.format)}`}
                    >
                      {idea.format}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void saveIdea(idea, idx)}
                      className="rounded-lg border border-border p-1.5 text-text-secondary transition-colors hover:border-accent/40 hover:bg-accent/5 hover:text-accent disabled:opacity-50 dark:border-zinc-700 dark:hover:text-blue-400"
                      aria-label={`Save “${idea.title}”`}
                      title="Save to Saved tab"
                    >
                      <Bookmark
                        className={`h-4 w-4 ${busy ? "opacity-50" : ""}`}
                        aria-hidden
                      />
                    </button>
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
              );
            })}
          </ul>
        ) : null}

        {!loading && !current ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900/25 sm:px-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent dark:bg-blue-500/15 dark:text-blue-400">
              <Lightbulb className="h-7 w-7" aria-hidden />
            </div>
            <p className="mt-5 text-sm font-semibold text-text-primary dark:text-zinc-100">
              No ideas yet
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary dark:text-zinc-500">
              Set industry and niche above, then run{" "}
              <strong className="font-medium text-text-primary/90 dark:text-zinc-400">
                Generate ideas
              </strong>{" "}
              for web-backed concepts, or{" "}
              <strong className="font-medium text-text-primary/90 dark:text-zinc-400">
                Sample ideas
              </strong>{" "}
              for instant starters. Bookmark anything you like, or add custom
              ideas from the{" "}
              <strong className="font-medium text-text-primary/90 dark:text-zinc-400">
                Saved
              </strong>{" "}
              tab.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
