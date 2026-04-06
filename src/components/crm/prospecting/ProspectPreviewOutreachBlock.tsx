"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Copy,
  ExternalLink,
  Loader2,
  Monitor,
  Smartphone,
  Workflow,
} from "lucide-react";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import type {
  StitchProspectDesignPayload,
  StitchProspectDesignResult,
} from "@/lib/crm/stitch-prospect-design-types";
import {
  stitchWithGoogleAppHomeUrl,
  stitchWithGoogleProjectUrl,
} from "@/lib/crm/stitch-withgoogle-url";

/** Context for Google Stitch prompts (Local Business listing or URL research). */
export type ProspectStitchContext =
  | { kind: "place"; place: PlacesSearchPlace }
  | {
      kind: "url";
      url: string;
      pageTitle: string | null;
      metaDescription: string | null;
    };

type StitchOk = Extract<StitchProspectDesignResult, { ok: true }>;

const STITCH_HELP_URL = stitchWithGoogleAppHomeUrl();

function stitchBrandingSummary(ctx: ProspectStitchContext): string {
  if (ctx.kind === "place") {
    const p = ctx.place;
    const bits = [p.name, p.formattedAddress].filter((x) => x?.trim());
    return bits.length ? bits.join(" · ") : p.name;
  }
  const title = ctx.pageTitle?.trim();
  return title ? `${title} · ${ctx.url}` : ctx.url;
}

type Props = {
  /** When set, Stitch web/mobile cards use listing or URL branding context. */
  stitchContext?: ProspectStitchContext | null;
  /** Clears Stitch results when the active prospect report changes. */
  reportKey?: string;
};

export default function ProspectPreviewOutreachBlock({
  stitchContext = null,
  reportKey = "",
}: Props) {
  const [servicesOverride, setServicesOverride] = useState("");
  const [colorVibeOverride, setColorVibeOverride] = useState("");
  const [stitchWebBusy, setStitchWebBusy] = useState(false);
  const [stitchMobileBusy, setStitchMobileBusy] = useState(false);
  const [stitchWebResult, setStitchWebResult] = useState<StitchOk | null>(null);
  const [stitchMobileResult, setStitchMobileResult] = useState<StitchOk | null>(null);
  const [stitchWebError, setStitchWebError] = useState<string | null>(null);
  const [stitchMobileError, setStitchMobileError] = useState<string | null>(null);
  /**
   * Whether GET /api/prospecting/stitch-config saw STITCH_API_KEY (informational only).
   * We do not disable generate on `false` — stale false happens after adding a key without refresh, or first fetch timing.
   */
  const [stitchApiConfigured, setStitchApiConfigured] = useState<boolean | null>(null);
  /** When true, server adds screens to STITCH_PROJECT_ID instead of createProject each run. */
  const [stitchLinkedProjectConfigured, setStitchLinkedProjectConfigured] = useState(false);
  const [stitchConfigCheckFailed, setStitchConfigCheckFailed] = useState(false);
  const [stitchManualTarget, setStitchManualTarget] = useState<null | "website" | "mobile">(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStitchConfigCheckFailed(false);
    void fetch("/api/prospecting/stitch-config", { credentials: "same-origin" })
      .then(async (res) => {
        const data: unknown = await res.json().catch(() => null);
        if (cancelled) return;
        if (
          data &&
          typeof data === "object" &&
          "ok" in data &&
          (data as { ok: unknown }).ok === true &&
          "stitchApiKeyConfigured" in data &&
          typeof (data as { stitchApiKeyConfigured: unknown }).stitchApiKeyConfigured === "boolean"
        ) {
          const o = data as {
            stitchApiKeyConfigured: boolean;
            stitchLinkedProjectConfigured?: unknown;
          };
          setStitchApiConfigured(o.stitchApiKeyConfigured);
          setStitchLinkedProjectConfigured(
            typeof o.stitchLinkedProjectConfigured === "boolean" ? o.stitchLinkedProjectConfigured : false
          );
        } else {
          setStitchConfigCheckFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setStitchConfigCheckFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reportKey]);

  useEffect(() => {
    setStitchWebBusy(false);
    setStitchMobileBusy(false);
    setStitchWebResult(null);
    setStitchMobileResult(null);
    setStitchWebError(null);
    setStitchMobileError(null);
  }, [reportKey]);

  const copyAndFlash = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMsg("Copied to clipboard.");
      setTimeout(() => setCopyMsg(null), 2500);
    } catch {
      setCopyMsg("Could not copy (browser blocked).");
      setTimeout(() => setCopyMsg(null), 3500);
    }
  }, []);

  const copyStitchPromptManual = useCallback(
    async (target: "website" | "mobile") => {
      const payload = buildStitchPayload(target);
      if (!payload) return;
      setStitchManualTarget(target);
      try {
        const res = await fetch("/api/prospecting/stitch-design-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        });
        const text = await res.text();
        let data: unknown = null;
        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            data = null;
          }
        }
        if (!data || typeof data !== "object") {
          setCopyMsg("Could not build Stitch prompt.");
          setTimeout(() => setCopyMsg(null), 4000);
          return;
        }
        const o = data as Record<string, unknown>;
        if (o.ok !== true || typeof o.prompt !== "string") {
          const err = typeof o.error === "string" ? o.error : "Could not build Stitch prompt.";
          setCopyMsg(err);
          setTimeout(() => setCopyMsg(null), 4000);
          return;
        }
        const d = {
          prompt: o.prompt,
          projectTitle: typeof o.projectTitle === "string" ? o.projectTitle : undefined,
          deviceType: typeof o.deviceType === "string" ? o.deviceType : undefined,
        };
        const header = [
          d.projectTitle ? `Suggested project title: ${d.projectTitle}` : null,
          d.deviceType ? `Device type for Stitch: ${d.deviceType}` : null,
        ]
          .filter(Boolean)
          .join("\n");
        const clip = [header, "", d.prompt].filter(Boolean).join("\n");
        await navigator.clipboard.writeText(clip);
        setCopyMsg("Prompt copied. Paste it into Google Stitch in the new tab.");
        setTimeout(() => setCopyMsg(null), 3500);
        window.open(STITCH_HELP_URL, "_blank", "noopener,noreferrer");
      } catch {
        setCopyMsg("Could not copy prompt (browser blocked or network error).");
        setTimeout(() => setCopyMsg(null), 4000);
      } finally {
        setStitchManualTarget(null);
      }
    },
    [stitchContext, servicesOverride, colorVibeOverride]
  );

  function buildStitchPayload(target: "website" | "mobile"): StitchProspectDesignPayload | null {
    if (!stitchContext) return null;
    const servicesLine = servicesOverride.trim() || undefined;
    const colorVibe = colorVibeOverride.trim() || undefined;
    if (stitchContext.kind === "place") {
      return {
        target,
        kind: "place",
        place: stitchContext.place,
        servicesLine,
        colorVibe,
      };
    }
    return {
      target,
      kind: "url",
      url: stitchContext.url,
      pageTitle: stitchContext.pageTitle,
      metaDescription: stitchContext.metaDescription,
      servicesLine,
      colorVibe,
    };
  }

  const runStitchDesign = useCallback(
    async (target: "website" | "mobile") => {
      const payload = buildStitchPayload(target);
      if (!payload) return;
      if (target === "website") {
        setStitchWebBusy(true);
        setStitchWebError(null);
      } else {
        setStitchMobileBusy(true);
        setStitchMobileError(null);
      }
      try {
        const res = await fetch("/api/prospecting/stitch-design", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        });
        const text = await res.text();
        let parsed: unknown = null;
        if (text) {
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = null;
          }
        }
        const r =
          parsed &&
          typeof parsed === "object" &&
          "ok" in parsed &&
          typeof (parsed as { ok: unknown }).ok === "boolean"
            ? (parsed as StitchProspectDesignResult)
            : null;
        if (!r) {
          if (target === "website") {
            setStitchWebError("Invalid response from Stitch API.");
            setStitchWebResult(null);
          } else {
            setStitchMobileError("Invalid response from Stitch API.");
            setStitchMobileResult(null);
          }
          return;
        }
        if (!r.ok) {
          if ("code" in r && r.code === "STITCH_API_KEY_MISSING") {
            setStitchApiConfigured(false);
          }
          if (target === "website") {
            setStitchWebError(r.error);
            setStitchWebResult(null);
          } else {
            setStitchMobileError(r.error);
            setStitchMobileResult(null);
          }
          return;
        }
        setStitchApiConfigured(true);
        if (target === "website") {
          setStitchWebResult(r);
        } else {
          setStitchMobileResult(r);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Stitch request failed.";
        if (target === "website") {
          setStitchWebError(msg);
          setStitchWebResult(null);
        } else {
          setStitchMobileError(msg);
          setStitchMobileResult(null);
        }
      } finally {
        if (target === "website") setStitchWebBusy(false);
        else setStitchMobileBusy(false);
      }
    },
    [stitchContext, servicesOverride, colorVibeOverride]
  );

  const stitchWebsiteResultBlock =
    stitchWebResult || stitchWebError ? (
      <div className="rounded-lg border border-violet-500/25 bg-violet-500/[0.06] p-3 dark:border-violet-400/20 dark:bg-violet-500/10">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-900/80 dark:text-violet-200/90">
          Stitch · desktop concept
        </p>
        {stitchWebError ? (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
            {stitchWebError}
          </p>
        ) : stitchWebResult ? (
          <div className="mt-2 space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- Stitch CDN screenshot URL */}
            <img
              src={stitchWebResult.imageUrl}
              alt="Stitch website design preview"
              className="max-h-48 w-full rounded-md border border-border object-contain object-top dark:border-zinc-700"
            />
            <div className="flex flex-wrap gap-2">
              {stitchWebResult.hostedPreviewUrl ? (
                <a
                  href={stitchWebResult.hostedPreviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-violet-800 hover:underline dark:text-violet-200"
                >
                  Open hosted preview
                  <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
                </a>
              ) : null}
              <a
                href={stitchWithGoogleProjectUrl(stitchWebResult.projectId)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:underline dark:text-violet-300"
              >
                Open in Stitch
                <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
              </a>
              <a
                href={stitchWebResult.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary hover:underline dark:text-zinc-400 dark:hover:text-zinc-300"
              >
                Download HTML
                <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
              </a>
              <button
                type="button"
                onClick={() =>
                  void copyAndFlash(
                    `Project: ${stitchWebResult.projectId}\nScreen: ${stitchWebResult.screenId}\n${stitchWebResult.projectTitle}`
                  )
                }
                className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary dark:text-zinc-400"
              >
                <Copy className="h-3 w-3" aria-hidden />
                Copy project &amp; screen IDs
              </button>
            </div>
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <div className="space-y-4">
      {copyMsg ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-400" role="status">
          {copyMsg}
        </p>
      ) : null}

      {stitchContext && stitchApiConfigured === false ? (
        <div className="rounded-xl border border-border/80 bg-surface/35 p-3 dark:border-zinc-700 dark:bg-zinc-900/45">
          <p className="text-xs font-semibold text-text-primary dark:text-zinc-100">
            Server does not see STITCH_API_KEY yet
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-text-secondary dark:text-zinc-400">
            Generate uses the Stitch <span className="font-medium">HTTP API</span> on this server. Add{" "}
            <span className="font-mono">STITCH_API_KEY</span> or{" "}
            <span className="font-mono">GOOGLE_STITCH_API_KEY</span> to{" "}
            <span className="font-mono">.env.local</span> / Vercel (no quotes), then{" "}
            <span className="font-medium">restart</span> <span className="font-mono">npm run dev</span> or redeploy.
            Or use{" "}
            <span className="font-medium text-text-primary dark:text-zinc-200">
              Copy prompt &amp; open Google Stitch
            </span>{" "}
            — see <span className="font-mono">.env.example</span>.
          </p>
        </div>
      ) : null}
      {stitchContext && stitchConfigCheckFailed ? (
        <p className="text-[11px] text-text-secondary dark:text-zinc-500" role="status">
          Could not verify Stitch configuration; one-click generate may still work if the key is set on the server.
        </p>
      ) : null}
      {stitchContext && stitchLinkedProjectConfigured ? (
        <p className="text-[11px] text-text-secondary dark:text-zinc-500" role="status">
          New Stitch screens are added to your linked project (
          <span className="font-mono">STITCH_PROJECT_ID</span> on the server), not a new project each time.
        </p>
      ) : null}

      <section
        aria-labelledby="prospect-offering-webapp-heading"
        className="rounded-xl border border-border/80 bg-surface/40 p-4 dark:border-zinc-700/70 dark:bg-zinc-900/50"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3
            id="prospect-offering-webapp-heading"
            className="text-xs font-semibold uppercase tracking-widest text-text-secondary/80 dark:text-zinc-500"
          >
            Web app design (Stitch)
          </h3>
          <Monitor className="h-4 w-4 shrink-0 text-text-secondary opacity-70 dark:text-zinc-500" aria-hidden />
        </div>
        <p className="mt-2 text-xs text-text-secondary dark:text-zinc-400">
          {stitchContext ? (
            stitchContext.kind === "place" ? (
              <>
                Uses your{" "}
                <span className="font-medium text-text-primary dark:text-zinc-200">Google Business Profile</span>{" "}
                (name, address, categories, rating, listing website) as branding context for a desktop-sized web app UI
                concept.
              </>
            ) : (
              <>
                URL research only — brand context comes from the fetched page title and meta description. Open a{" "}
                <span className="font-medium text-text-primary dark:text-zinc-200">Local Business</span> listing for
                full Google profile fields.
              </>
            )
          ) : (
            <>
              Open a <span className="font-medium text-text-primary dark:text-zinc-200">Local Business</span> listing or
              run <span className="font-medium text-text-primary dark:text-zinc-200">URL research</span> above to enable
              Stitch with branding context.
            </>
          )}
        </p>
        {stitchContext ? (
          <p className="mt-2 rounded-lg border border-border/60 bg-white/40 px-2.5 py-2 text-[11px] text-text-secondary dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
            {stitchBrandingSummary(stitchContext)}
          </p>
        ) : null}
        {stitchContext ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                Services (optional — overrides inferred categories)
              </label>
              <input
                value={servicesOverride}
                onChange={(e) => setServicesOverride(e.target.value)}
                placeholder="e.g. Full-service pet grooming, nail trims, de-shedding"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                Color and mood (optional — default from env)
              </label>
              <input
                value={colorVibeOverride}
                onChange={(e) => setColorVibeOverride(e.target.value)}
                placeholder="e.g. Soft teal and cream, friendly and spotless"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          </div>
        ) : null}
        <p className="mt-2 text-[11px] text-text-secondary/90 dark:text-zinc-500">
          Generation often takes a few minutes. Do not double-click — the Stitch API may still complete if the request
          times out at the edge.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            disabled={!stitchContext || stitchWebBusy}
            onClick={() => void runStitchDesign("website")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-800 shadow-sm transition-colors hover:bg-violet-500/15 disabled:opacity-50 dark:border-violet-400/35 dark:bg-violet-500/15 dark:text-violet-200 dark:hover:bg-violet-500/25 sm:w-auto"
          >
            {stitchWebBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Monitor className="h-4 w-4" aria-hidden />
            )}
            {stitchWebBusy ? "Stitch (web app)…" : "Generate web app UI in Google Stitch"}
          </button>
          {stitchContext && stitchApiConfigured === false ? (
            <button
              type="button"
              disabled={stitchManualTarget !== null}
              onClick={() => void copyStitchPromptManual("website")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-violet-500/50 bg-transparent px-4 py-2.5 text-sm font-semibold text-violet-900 shadow-sm transition-colors hover:bg-violet-500/10 disabled:opacity-50 dark:border-violet-400/40 dark:text-violet-200 dark:hover:bg-violet-500/15 sm:w-auto"
            >
              {stitchManualTarget === "website" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Copy className="h-4 w-4" aria-hidden />
              )}
              Copy prompt &amp; open Google Stitch
            </button>
          ) : null}
        </div>
        {stitchWebsiteResultBlock}
      </section>

      <section
        aria-labelledby="prospect-offering-mobile-heading"
        className="rounded-xl border border-border/80 bg-surface/40 p-4 dark:border-zinc-700/70 dark:bg-zinc-900/50"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3
            id="prospect-offering-mobile-heading"
            className="text-xs font-semibold uppercase tracking-widest text-text-secondary/80 dark:text-zinc-500"
          >
            Mobile app design (Stitch)
          </h3>
          <Smartphone className="h-4 w-4 shrink-0 text-text-secondary opacity-70 dark:text-zinc-500" aria-hidden />
        </div>
        <p className="mt-2 text-xs text-text-secondary dark:text-zinc-400">
          {stitchContext ? (
            stitchContext.kind === "place" ? (
              <>
                Uses your{" "}
                <span className="font-medium text-text-primary dark:text-zinc-200">Google Business Profile</span>{" "}
                (name, address, categories, rating, listing website) as branding context for a phone-sized UI concept.
              </>
            ) : (
              <>
                URL research only — brand context comes from the fetched page title and meta description. Open a{" "}
                <span className="font-medium text-text-primary dark:text-zinc-200">Local Business</span> listing for
                full Google profile fields.
              </>
            )
          ) : (
            <>
              Open a <span className="font-medium text-text-primary dark:text-zinc-200">Local Business</span> listing or
              run <span className="font-medium text-text-primary dark:text-zinc-200">URL research</span> above to enable
              Stitch with branding context.
            </>
          )}
        </p>
        {stitchContext ? (
          <p className="mt-2 rounded-lg border border-border/60 bg-white/40 px-2.5 py-2 text-[11px] text-text-secondary dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
            {stitchBrandingSummary(stitchContext)}
          </p>
        ) : null}
        <p className="mt-2 text-[11px] text-text-secondary/90 dark:text-zinc-500">
          One-click mobile generate calls the Stitch API with{" "}
          <span className="font-medium text-text-primary dark:text-zinc-300">Gemini 3.1 Pro</span> for deeper layout
          reasoning (aligned with &quot;Thinking with 3.1 Pro&quot; in the Stitch app).
        </p>
        <p className="mt-2 text-[11px] text-text-secondary/90 dark:text-zinc-500">
          Generation often takes a few minutes. Do not double-click — the Stitch API may still complete if the request
          times out at the edge.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            disabled={!stitchContext || stitchMobileBusy}
            onClick={() => void runStitchDesign("mobile")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-800 shadow-sm transition-colors hover:bg-violet-500/15 disabled:opacity-50 dark:border-violet-400/35 dark:bg-violet-500/15 dark:text-violet-200 dark:hover:bg-violet-500/25 sm:w-auto"
          >
            {stitchMobileBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Smartphone className="h-4 w-4" aria-hidden />
            )}
            {stitchMobileBusy ? "Stitch (mobile)…" : "Generate mobile UI in Google Stitch"}
          </button>
          {stitchContext && stitchApiConfigured === false ? (
            <button
              type="button"
              disabled={stitchManualTarget !== null}
              onClick={() => void copyStitchPromptManual("mobile")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-violet-500/50 bg-transparent px-4 py-2.5 text-sm font-semibold text-violet-900 shadow-sm transition-colors hover:bg-violet-500/10 disabled:opacity-50 dark:border-violet-400/40 dark:text-violet-200 dark:hover:bg-violet-500/15 sm:w-auto"
            >
              {stitchManualTarget === "mobile" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Copy className="h-4 w-4" aria-hidden />
              )}
              Copy prompt &amp; open Google Stitch
            </button>
          ) : null}
        </div>
        {stitchMobileError ? (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
            {stitchMobileError}
          </p>
        ) : null}
        {stitchMobileResult ? (
          <div className="mt-3 space-y-2 rounded-lg border border-violet-500/25 bg-violet-500/[0.06] p-3 dark:border-violet-400/20 dark:bg-violet-500/10">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-900/80 dark:text-violet-200/90">
              Stitch · mobile concept
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element -- Stitch CDN screenshot URL */}
            <img
              src={stitchMobileResult.imageUrl}
              alt="Stitch mobile design preview"
              className="max-h-64 w-full rounded-md border border-border object-contain object-top dark:border-zinc-700"
            />
            <div className="flex flex-wrap gap-2">
              {stitchMobileResult.hostedPreviewUrl ? (
                <a
                  href={stitchMobileResult.hostedPreviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-violet-800 hover:underline dark:text-violet-200"
                >
                  Open hosted preview
                  <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
                </a>
              ) : null}
              <a
                href={stitchWithGoogleProjectUrl(stitchMobileResult.projectId)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:underline dark:text-violet-300"
              >
                Open in Stitch
                <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
              </a>
              <a
                href={stitchMobileResult.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary hover:underline dark:text-zinc-400 dark:hover:text-zinc-300"
              >
                Download HTML
                <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
              </a>
              <button
                type="button"
                onClick={() =>
                  void copyAndFlash(
                    `Project: ${stitchMobileResult.projectId}\nScreen: ${stitchMobileResult.screenId}\n${stitchMobileResult.projectTitle}`
                  )
                }
                className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary dark:text-zinc-400"
              >
                <Copy className="h-3 w-3" aria-hidden />
                Copy project &amp; screen IDs
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section
        aria-labelledby="prospect-offering-automations-heading"
        className="rounded-xl border border-border/80 bg-surface/40 p-4 dark:border-zinc-700/70 dark:bg-zinc-900/50"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3
            id="prospect-offering-automations-heading"
            className="text-xs font-semibold uppercase tracking-widest text-text-secondary/80 dark:text-zinc-500"
          >
            AI automations
          </h3>
          <Workflow className="h-4 w-4 shrink-0 text-text-secondary opacity-70 dark:text-zinc-500" aria-hidden />
        </div>
        <p className="mt-2 text-xs text-text-secondary dark:text-zinc-400">
          {stitchContext ? (
            stitchContext.kind === "place" ? (
              <>
                Uses your{" "}
                <span className="font-medium text-text-primary dark:text-zinc-200">Google Business Profile</span> and
                listing signals as context to propose AI workflows (lead routing, follow-ups, scheduling handoffs).
                Generation in Stitch is not wired for automations yet — this block keeps the same prospecting pattern
                for when it is.
              </>
            ) : (
              <>
                URL research only — use a <span className="font-medium text-text-primary dark:text-zinc-200">Local Business</span>{" "}
                listing for richer automation ideas tied to categories and hours.
              </>
            )
          ) : (
            <>
              Open a listing or URL research above; when automation generation is available, it will use the same
              branding context as web and mobile Stitch.
            </>
          )}
        </p>
        {stitchContext ? (
          <p className="mt-2 rounded-lg border border-border/60 bg-white/40 px-2.5 py-2 text-[11px] text-text-secondary dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
            {stitchBrandingSummary(stitchContext)}
          </p>
        ) : null}
        <p className="mt-2 text-[11px] text-text-secondary/90 dark:text-zinc-500">
          No API is connected yet — avoids duplicate Stitch calls while web and mobile concepts stay above.
        </p>
        <button
          type="button"
          disabled
          className="mt-3 inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-border/80 bg-surface/30 px-4 py-2.5 text-sm font-semibold text-text-secondary/80 opacity-70 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-500 sm:w-auto"
        >
          <Workflow className="h-4 w-4" aria-hidden />
          Generate automation concept (coming soon)
        </button>
      </section>
    </div>
  );
}
