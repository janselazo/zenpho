"use client";

import { useCallback, useMemo, useState } from "react";
import { Bookmark, Plus } from "lucide-react";
import {
  DEFAULT_NICHE_ID,
  INDUSTRIES,
  getNichesForIndustry,
  nicheAllowedForIndustry,
  type IndustryId,
  type LeadMagnetIdea,
  type NicheId,
} from "@/lib/crm/lead-magnet-industries";
import { saveLeadMagnetFromIdea } from "@/app/(crm)/actions/saved-lead-magnets";
import { formatBadgeClass } from "@/components/crm/lead-magnets/lead-magnet-card-styles";
import { HorizontalPillScroller } from "@/components/crm/lead-magnets/lead-magnets-scroll";
import ManualLeadMagnetModal from "@/components/crm/lead-magnets/ManualLeadMagnetModal";

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
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

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
    <div>
      <div className="mt-0">
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
        <button
          type="button"
          onClick={() => setManualOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text-primary dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-200"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add idea manually
        </button>
      </div>

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
          <p className="text-sm text-text-secondary dark:text-zinc-500">
            Choose an industry and niche, then click <strong>Generate ideas</strong>{" "}
            to pull web context and synthesize concepts, or load starter ideas
            without API keys.
          </p>
        ) : null}
      </div>

      <ManualLeadMagnetModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onSaved={onSaved}
      />
    </div>
  );
}
