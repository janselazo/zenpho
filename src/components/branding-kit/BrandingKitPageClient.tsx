"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileDown,
  Loader2,
  Palette,
  RotateCcw,
} from "lucide-react";
import BrandingKitHeroSearch from "@/components/branding-kit/BrandingKitHeroSearch";
import { businessSearchResultToPlacesPlace } from "@/components/branding-kit/map-business-search-to-places";
import Button from "@/components/ui/Button";
import type { BusinessSearchResult } from "@/lib/revenue-leak-audit/types";

const progressSteps = [
  "Analyzing Google Business Profile",
  "Pulling logo and brand colors",
  "Generating brand positioning",
  "Planning sales funnel stages",
  "Creating funnel creative",
  "Composing PDF document",
  "Finalizing report",
];

const PROGRESS_AUTOSTEP_CAP = Math.max(0, progressSteps.length - 2);
/** Ring pacing while the server runs LLM/image steps (often several minutes). */
const BRANDING_COUNTDOWN_SECONDS = 180;
const ESTIMATED_BRANDING_MS = BRANDING_COUNTDOWN_SECONDS * 1_000;
const ANALYSIS_RING_INDETERMINATE_CAP = 0.92;
const CLIENT_FETCH_MS = 14 * 60 * 1000;

type Stage = "search" | "generating" | "kit";

type SearchResponse = {
  ok: boolean;
  businesses?: BusinessSearchResult[];
  error?: string;
  warnings?: string[];
};

type BrandingPdfResult =
  | {
      ok: true;
      pdfUrl: string;
      filename: string;
      imageWarnings?: string[];
    }
  | { ok: false; error: string };

function BrandAnalyzingRing({ progress, secondsLeft }: { progress: number; secondsLeft: number }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const dash = clamped * circumference;
  const pct = Math.round(clamped * 100);
  return (
    <div className="relative h-10 w-10 shrink-0">
      <svg
        viewBox="0 0 56 56"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`Brand kit building, timer about ${secondsLeft} seconds`}
        className="absolute inset-0 h-full w-full -rotate-90"
      >
        <circle cx="28" cy="28" r={radius} fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke="white"
          strokeLinecap="round"
          strokeWidth="4"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-sm font-black tabular-nums leading-none tracking-tight text-white"
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.35)" }}
        aria-hidden
      >
        {secondsLeft}
      </span>
    </div>
  );
}

function GeneratingScreen({
  step,
  ringProgress,
  secondsLeft,
}: {
  step: number;
  ringProgress: number;
  secondsLeft: number;
}) {
  const headlineIndex = Math.min(step, progressSteps.length - 1);
  return (
    <section className="px-4 pt-6 pb-16 sm:px-6 sm:pt-8 sm:pb-20 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-border bg-white p-8 shadow-soft-lg dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white dark:bg-emerald-600">
            <BrandAnalyzingRing progress={ringProgress} secondsLeft={secondsLeft} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
              Building brand kit
            </p>
            <h2 className="text-2xl font-black text-text-primary dark:text-white">
              {progressSteps[headlineIndex]}
            </h2>
          </div>
        </div>
        <div className="mt-8 space-y-3">
          {progressSteps.map((label, index) => {
            const isDone = index < step;
            const isActive = index === step;
            const indicatorClass = isDone
              ? "border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-600"
              : isActive
                ? "border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-600"
                : "border-border bg-surface text-text-secondary";
            return (
              <div key={label} className="flex items-center gap-3">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${indicatorClass}`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 stroke-[2.5] text-white" aria-hidden />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={
                    isDone || isActive
                      ? "font-semibold text-text-primary dark:text-white"
                      : "text-text-secondary"
                  }
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-sm text-text-secondary">
          This can take a few minutes—we&apos;re generating visuals and copy. Leave this tab open.
        </p>
      </div>
    </section>
  );
}

function InlineAlert({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-900/80 dark:bg-red-950/50 dark:text-red-400">
        {message}
      </div>
    </div>
  );
}

export default function BrandingKitPageClient() {
  const [stage, setStage] = useState<Stage>("search");
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<BusinessSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState(0);
  const [ringProgress, setRingProgress] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(BRANDING_COUNTDOWN_SECONDS);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const restart = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStage("search");
    setSearching(false);
    setBusy(false);
    setSelected(null);
    setError(null);
    setPdfUrl(null);
    setFilename(null);
    setStatusNote(null);
    setProgressStep(0);
    setRingProgress(0);
    setSecondsLeft(BRANDING_COUNTDOWN_SECONDS);
  }, []);

  const runPdfGeneration = useCallback(async (result: BusinessSearchResult) => {
    setBusy(true);
    setError(null);
    setPdfUrl(null);
    setFilename(null);
    setStatusNote(null);
    setStage("generating");
    setSelected(result);

    const place = businessSearchResultToPlacesPlace(result);
    const analysisStart = Date.now();
    setProgressStep(0);
    setRingProgress(0);
    setSecondsLeft(BRANDING_COUNTDOWN_SECONDS);

    let ringRafId = 0;
    let ringLoopCancelled = false;
    const tickRing = () => {
      if (ringLoopCancelled) return;
      const elapsed = Date.now() - analysisStart;
      setRingProgress(Math.min(ANALYSIS_RING_INDETERMINATE_CAP, elapsed / ESTIMATED_BRANDING_MS));
      setSecondsLeft(Math.max(0, Math.ceil((ESTIMATED_BRANDING_MS - elapsed) / 1000)));
      ringRafId = requestAnimationFrame(tickRing);
    };
    ringRafId = requestAnimationFrame(tickRing);

    const stepInterval = window.setInterval(() => {
      setProgressStep((s) => Math.min(PROGRESS_AUTOSTEP_CAP, s + 1));
    }, 1100);

    const ac = new AbortController();
    abortRef.current = ac;
    const timeoutId = window.setTimeout(() => ac.abort(), CLIENT_FETCH_MS);

    try {
      const res = await fetch("/api/marketing/branding-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          businessName: result.name,
          place,
          report: null,
        }),
      });
      clearTimeout(timeoutId);
      const text = await res.text();
      let data: BrandingPdfResult | null = null;
      if (text) {
        try {
          data = JSON.parse(text) as BrandingPdfResult;
        } catch {
          data = null;
        }
      }
      if (!data) {
        throw new Error(
          res.ok
            ? "Brand kit PDF finished but the server returned an invalid response."
            : `Request failed (${res.status}): ${text.slice(0, 240) || res.statusText}`,
        );
      }
      if (!data.ok) {
        throw new Error(data.error);
      }

      ringLoopCancelled = true;
      cancelAnimationFrame(ringRafId);
      setSecondsLeft(0);
      setRingProgress(1);
      window.clearInterval(stepInterval);

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 240);
      });
      setProgressStep(progressSteps.length - 1);

      setPdfUrl(data.pdfUrl);
      setFilename(data.filename);
      if (data.imageWarnings && data.imageWarnings.length > 0) {
        const head = data.imageWarnings.slice(0, 2).join("; ");
        const extra =
          data.imageWarnings.length > 2 ? ` (+${data.imageWarnings.length - 2} more)` : "";
        setStatusNote(
          `Placeholder imagery used in spots — ${data.imageWarnings.length} slot(s): ${head}${extra}.`,
        );
      } else {
        setStatusNote(`Brand guidelines ready. ${data.filename}`);
      }
      setStage("kit");
    } catch (e) {
      const aborted =
        (typeof DOMException !== "undefined" &&
          e instanceof DOMException &&
          e.name === "AbortError") ||
        (e instanceof Error && e.name === "AbortError");
      ringLoopCancelled = true;
      cancelAnimationFrame(ringRafId);
      window.clearInterval(stepInterval);
      clearTimeout(timeoutId);
      setError(
        aborted
          ? "Generation hit the client timeout (try again, or regenerate from the toolkit below)."
          : e instanceof Error
            ? e.message
            : "Brand guidelines PDF failed.",
      );
      setStage("kit");
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }, []);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  async function handleSearchSubmit(businessName: string) {
    if (businessName.trim().length < 2) {
      setError("Enter a business name.");
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const res = await fetch("/api/revenue-leak-audit/business-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName }),
      });
      const data = (await res.json()) as SearchResponse;
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Search failed.");
      const first = data.businesses?.[0];
      if (!first) throw new Error("No Google Business Profile matches were found.");
      await runPdfGeneration(first);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  function downloadPdf() {
    if (!pdfUrl || !filename) return;
    try {
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.download = filename;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.click();
    } catch {
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="pb-24">
      {stage === "search" ? (
        <BrandingKitHeroSearch
          variant="standalone"
          searching={searching || busy}
          onSearch={handleSearchSubmit}
          onSelectBusiness={(r) => void runPdfGeneration(r)}
        />
      ) : (
        <>
          <div className="hero-sky px-4 pt-24 pb-4 sm:px-6 sm:pb-5 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-white/80 px-4 py-2 text-xs font-bold tracking-wide text-emerald-700 shadow-sm dark:border-emerald-400/35 dark:text-emerald-400">
                <Palette className="h-3.5 w-3.5 shrink-0" />
                Brand &amp; funnel
              </div>
              <h1 className="heading-display text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
                Brand kit tool
              </h1>
              {selected ? (
                <p className="mx-auto mt-3 max-w-xl text-sm text-text-secondary">{selected.name}</p>
              ) : null}
            </div>
          </div>
        </>
      )}

      {error ? <InlineAlert message={error} /> : null}

      {stage === "generating" ? (
        <GeneratingScreen step={progressStep} ringProgress={ringProgress} secondsLeft={secondsLeft} />
      ) : null}

      {stage === "kit" ? (
        <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[1.75rem] border border-emerald-600/35 bg-white p-6 shadow-soft-lg dark:border-emerald-400/25 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-text-secondary dark:text-zinc-400">
                  Brand kit + sales funnel
                </p>
                <p className="mt-1 text-sm text-text-secondary dark:text-zinc-500">
                  Your PDF bundles positioning, palettes, typography, messaging, and funnel creative.
                </p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300">
                <Palette className="h-4 w-4" aria-hidden />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Button
                type="button"
                size="lg"
                className="w-full justify-center !border-transparent !bg-emerald-600 !text-white hover:!bg-emerald-700 hover:!shadow-md sm:w-auto"
                disabled={busy || !selected}
                onClick={() => selected && void runPdfGeneration(selected)}
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Palette className="mr-2 h-4 w-4" />}
                Generate brand kit &amp; funnel (PDF)
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="w-full justify-center border-emerald-600/35 text-emerald-900 hover:bg-emerald-50 sm:w-auto dark:border-emerald-400/35 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                disabled={!pdfUrl || !filename}
                onClick={downloadPdf}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>
            {statusNote ? (
              <p className="mt-4 font-mono text-[11px] leading-relaxed text-text-secondary dark:text-zinc-500">
                {statusNote}
              </p>
            ) : (
              <p className="mt-4 font-mono text-[11px] text-text-secondary/70 dark:text-zinc-600">
                After generation, preview appears below—or open in a new tab if embedding is blocked.
              </p>
            )}
          </div>

          {pdfUrl ? (
            <div className="mt-10 space-y-3">
              <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft dark:border-zinc-700 dark:bg-zinc-950">
                <iframe title="Brand kit preview" src={pdfUrl} className="min-h-[70vh] w-full border-0" />
              </div>
              <p className="text-center text-sm text-text-secondary">
                <Download className="mr-1 inline-block h-4 w-4 align-middle" aria-hidden />
                Prefer a standalone viewer?{" "}
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-emerald-700 underline dark:text-emerald-400"
                >
                  Open PDF in new tab
                </a>
              </p>
            </div>
          ) : null}

          <div className="mt-14 flex justify-center">
            <button
              type="button"
              onClick={restart}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-3 text-sm font-bold text-text-primary shadow-sm hover:border-emerald-600/35 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:border-emerald-400/40"
            >
              <RotateCcw className="h-4 w-4" />
              Start another business
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
