"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2,
  CheckCircle2,
  FileDown,
  Loader2,
  Palette,
  Search,
  Sparkles,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { revenueLeakAuditInputClass } from "@/components/revenue-leak-audit/RevenueLeakHeroSearch";
import { buildMarketIntelReport } from "@/lib/crm/prospect-intel-report";
import { signalsFromPlace } from "@/lib/crm/prospect-intel-place-signals";
import { sanitizePlacesSearchPlace } from "@/lib/crm/places-google-shared";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";

type Suggestion = { placeId: string; description: string };

type AutocompleteResponse = {
  suggestions?: Suggestion[];
  warning?: string | null;
  error?: string;
};

type DetailsResponse = {
  place?: PlacesSearchPlace | null;
  warning?: string | null;
  error?: string;
};

type BrandingPdfResponse =
  | {
      ok: true;
      pdfUrl: string;
      pdfPath: string;
      filename: string;
      imageWarnings?: string[];
    }
  | { ok: false; error: string };

type Stage = "search" | "generating" | "ready" | "error";

const PROGRESS_STEPS = [
  "Reading your Google Business Profile",
  "Resolving brand palette + typography from your site",
  "Drafting brand spec with AI",
  "Generating brand kit imagery",
  "Generating Meta + Google ad creatives",
  "Composing the brand book + sales funnel PDF",
];

/** Approx total runtime upper bound (PDF generation can take 2–3 minutes). */
const ESTIMATED_RUN_MS = 180_000;

export default function BrandingFunnelGenerator() {
  const [businessName, setBusinessName] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const autocompleteSeqRef = useRef(0);
  const wrapRef = useRef<HTMLLabelElement | null>(null);

  const [stage, setStage] = useState<Stage>("search");
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    pdfUrl: string;
    filename: string;
    imageWarnings?: string[];
    place: PlacesSearchPlace;
  } | null>(null);

  // Outside-click closes the autocomplete listbox.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Debounced Google Places autocomplete (mirrors PlacesBusinessAutocomplete).
  useEffect(() => {
    const q = businessName.trim();
    const seq = ++autocompleteSeqRef.current;
    setHint(null);
    if (q.length < 2 || stage === "generating") {
      setSuggestions([]);
      setSuggesting(false);
      return;
    }
    setSuggesting(true);
    const id = window.setTimeout(() => {
      const ac = new AbortController();
      void fetch("/api/prospecting/places-autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: q }),
        signal: ac.signal,
      })
        .then(async (res) => {
          const data = (await res.json()) as AutocompleteResponse;
          if (!res.ok) {
            throw new Error(data.error ?? "Could not load suggestions.");
          }
          if (seq !== autocompleteSeqRef.current) return;
          setSuggestions(data.suggestions ?? []);
          setHint(data.warning ?? null);
          setOpen(true);
        })
        .catch((e) => {
          if (seq !== autocompleteSeqRef.current) return;
          if (e instanceof DOMException && e.name === "AbortError") return;
          setSuggestions([]);
          setHint(e instanceof Error ? e.message : "Could not load suggestions.");
        })
        .finally(() => {
          if (seq === autocompleteSeqRef.current) setSuggesting(false);
        });
      return () => ac.abort();
    }, 320);
    return () => window.clearTimeout(id);
  }, [businessName, stage]);

  // Animated progress through the steps while we wait for the PDF.
  useEffect(() => {
    if (stage !== "generating") return;
    setStepIndex(0);
    const stepMs = ESTIMATED_RUN_MS / PROGRESS_STEPS.length;
    const id = window.setInterval(() => {
      setStepIndex((cur) =>
        cur >= PROGRESS_STEPS.length - 1 ? cur : cur + 1,
      );
    }, stepMs);
    return () => window.clearInterval(id);
  }, [stage]);

  async function resolvePlaceForSelection(
    selection: Suggestion,
  ): Promise<PlacesSearchPlace | null> {
    const res = await fetch("/api/prospecting/places-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId: selection.placeId }),
    });
    const data = (await res.json()) as DetailsResponse;
    if (!res.ok || !data.place) {
      throw new Error(
        data.error ?? data.warning ?? "Could not load business details.",
      );
    }
    return sanitizePlacesSearchPlace({
      ...data.place,
      businessStatus: data.place.businessStatus ?? null,
    });
  }

  async function startGeneration(place: PlacesSearchPlace) {
    setStage("generating");
    setError(null);
    setResult(null);
    setOpen(false);

    try {
      const report = buildMarketIntelReport(signalsFromPlace(place));
      const res = await fetch("/api/prospecting/branding-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: place.name || businessName,
          place,
          report,
        }),
      });
      const data = (await res.json()) as BrandingPdfResponse;
      if (!data.ok) {
        setStage("error");
        setError(data.error || "Could not generate the Brand Kit + Sales Funnel PDF.");
        return;
      }
      setStepIndex(PROGRESS_STEPS.length - 1);
      setResult({
        pdfUrl: data.pdfUrl,
        filename: data.filename,
        imageWarnings: data.imageWarnings,
        place,
      });
      setStage("ready");
    } catch (e) {
      setStage("error");
      setError(
        e instanceof Error
          ? e.message
          : "Brand Kit + Sales Funnel PDF generation failed.",
      );
    }
  }

  async function onSelectSuggestion(s: Suggestion) {
    setOpen(false);
    setBusinessName(s.description);
    setStage("generating");
    setError(null);
    setResult(null);
    try {
      const place = await resolvePlaceForSelection(s);
      if (!place) {
        setStage("error");
        setError("Could not resolve that business on Google.");
        return;
      }
      await startGeneration(place);
    } catch (e) {
      setStage("error");
      setError(
        e instanceof Error
          ? e.message
          : "Could not load business details from Google.",
      );
    }
  }

  function reset() {
    setStage("search");
    setError(null);
    setResult(null);
    setStepIndex(0);
    setBusinessName("");
    setSuggestions([]);
  }

  const isWorking = stage === "generating";
  const showHero = stage === "search" || stage === "error";

  return (
    <section className="hero-sky px-4 pb-16 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
      <div className="mx-auto max-w-6xl">
        {showHero ? (
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-white/80 px-4 py-2 text-xs font-bold tracking-wide text-emerald-700 shadow-sm dark:border-emerald-400/35 dark:text-emerald-400">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              Brand kit + sales funnel
            </div>
            <h1 className="heading-display text-5xl font-black tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
              <span className="block text-pretty leading-[1.02]">
                Generate a Brand Book +
              </span>
              <span className="mt-0.5 block text-pretty leading-[1.02] sm:mt-1">
                Sales <span className="text-accent">Funnel PDF</span>
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-text-secondary sm:text-xl">
              Pick a Google business and we will draft the brand book, paid-ads
              creatives for Meta, Instagram and Google, plus a landing page,
              budget and KPIs — all in one PDF.
            </p>
          </div>
        ) : null}

        {showHero ? (
          <form
            className="relative z-20 mx-auto mt-10 grid max-w-5xl gap-3 rounded-[2rem] border border-white/80 bg-white/90 p-3 shadow-soft-lg backdrop-blur lg:grid-cols-[minmax(0,1fr)_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              setOpen(false);
              if (suggestions[0]) {
                void onSelectSuggestion(suggestions[0]);
              }
            }}
          >
            <label ref={wrapRef} className="relative block">
              <span className="sr-only">Business name</span>
              <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <input
                value={businessName}
                onChange={(e) => {
                  setBusinessName(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                className={`${revenueLeakAuditInputClass} pl-11`}
                placeholder="Business name"
                autoComplete="off"
              />
              {open && (suggestions.length > 0 || suggesting || hint) ? (
                <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-border bg-white text-left shadow-soft-lg">
                  {suggesting ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-text-secondary">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching Google Business matches...
                    </div>
                  ) : null}
                  {suggestions.map((s) => (
                    <button
                      key={s.placeId}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => void onSelectSuggestion(s)}
                      className="block w-full border-t border-border/60 px-4 py-3 text-left transition-colors first:border-t-0 hover:bg-surface"
                    >
                      <span className="block text-sm font-bold text-text-primary">
                        {s.description}
                      </span>
                      <span className="mt-1 block text-xs text-text-secondary">
                        Select to draft the Brand Kit + Sales Funnel PDF
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
            <Button
              type="submit"
              size="lg"
              disabled={isWorking || suggestions.length === 0}
              className="h-full whitespace-nowrap"
            >
              {isWorking ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Generate Brand Kit
            </Button>
          </form>
        ) : null}

        {showHero ? (
          <p className="mt-4 text-center text-sm text-text-secondary">
            Search your Google Business Profile to draft the brand book and ads
            funnel.
          </p>
        ) : null}

        {stage === "error" && error ? (
          <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        ) : null}

        {stage === "generating" ? (
          <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-border bg-white/95 p-8 text-left shadow-soft-lg dark:border-zinc-700/70 dark:bg-zinc-900/70">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-accent" aria-hidden />
              <p className="text-sm font-semibold text-text-primary dark:text-zinc-100">
                Composing your Brand Kit + Sales Funnel PDF
              </p>
            </div>
            <p className="mt-2 text-xs text-text-secondary dark:text-zinc-400">
              This usually takes 2–3 minutes — we are generating brand spec,
              palette, type, ~13 AI images and the multi-page PDF.
            </p>
            <ol className="mt-5 space-y-2.5">
              {PROGRESS_STEPS.map((label, i) => {
                const done = i < stepIndex;
                const active = i === stepIndex;
                return (
                  <li
                    key={label}
                    className={`flex items-start gap-3 rounded-xl border px-3 py-2 text-sm ${
                      done
                        ? "border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
                        : active
                          ? "border-blue-200 bg-blue-50/80 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100"
                          : "border-border/60 bg-white/60 text-text-secondary dark:border-zinc-700/60 dark:bg-zinc-900/30 dark:text-zinc-400"
                    }`}
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                      {done ? (
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                      ) : active ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <span className="block h-2 w-2 rounded-full bg-current opacity-40" />
                      )}
                    </span>
                    <span>{label}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}

        {stage === "ready" && result ? (
          <div className="mx-auto mt-10 max-w-3xl rounded-3xl border border-border bg-white/95 p-8 shadow-soft-lg dark:border-zinc-700/70 dark:bg-zinc-900/70">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <Palette className="h-6 w-6" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                  Brand Kit + Sales Funnel PDF ready
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-text-primary dark:text-zinc-100">
                  {result.place.name}
                </h2>
                <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
                  Brand book, palette, typography, landing page concept, ads
                  copy and creatives, plus budget &amp; KPIs.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href={result.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={result.filename}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover"
              >
                <FileDown className="h-4 w-4" aria-hidden />
                Download PDF
              </a>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Generate another
              </button>
              <span className="font-mono text-[11px] text-text-secondary dark:text-zinc-500">
                {result.filename}
              </span>
            </div>

            {result.imageWarnings && result.imageWarnings.length > 0 ? (
              <details className="mt-5 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100">
                <summary className="cursor-pointer font-semibold">
                  {result.imageWarnings.length} image slot
                  {result.imageWarnings.length === 1 ? "" : "s"} fell back to
                  placeholders
                </summary>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {result.imageWarnings.slice(0, 8).map((w) => (
                    <li key={w} className="font-mono text-[11px]">
                      {w}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
