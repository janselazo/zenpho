"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  MessageCircle,
  Monitor,
  Send,
  Smartphone,
  Sparkles,
  Workflow,
} from "lucide-react";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import type {
  StitchProspectDesignPayload,
  StitchProspectDesignResult,
} from "@/lib/crm/stitch-prospect-design-types";
import { getProspectPreviewStatusAction } from "@/app/(crm)/actions/prospect-preview-generate-actions";
import {
  sendProspectPreviewEmailAction,
  sendProspectPreviewSmsAction,
} from "@/app/(crm)/actions/prospect-preview";
import { mergeProspectOutreachTemplate } from "@/lib/crm/prospect-outreach-template";
import {
  instagramProfileUrl,
  messengerHandoffUrlFromFacebook,
} from "@/lib/crm/social-handoff-urls";

const LS_SMS = "zenpho:prospect-preview-sms-template";
const LS_EMAIL_SUBJ = "zenpho:prospect-preview-email-subject";
const LS_EMAIL_BODY = "zenpho:prospect-preview-email-body";
const LS_YOUR_NAME = "zenpho:prospect-preview-your-name";

const DEFAULT_SMS =
  "Hi — we put together a quick site concept for {{businessName}}. Take a look: {{previewUrl}}";
const DEFAULT_EMAIL_SUBJ = "Quick site preview for {{businessName}}";
const DEFAULT_EMAIL_BODY =
  "Hi,\n\nWe prepared a one-page preview for {{businessName}}:\n{{previewUrl}}\n\nLet us know what you think.";

function readLs(key: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v?.trim() ? v : fallback;
  } catch {
    return fallback;
  }
}

function writeLs(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

export type ProspectPreviewOutreachSnapshot = {
  previewId: string;
  previewUrl: string;
  /** Primary origin + UUID — embed in CRM iframe when share URL is another host. */
  previewFrameUrl?: string;
  /** Pretty path segment (from business name); optional for older previews. */
  previewSlug?: string;
  businessName: string;
  screenshotStatus: string;
  screenshotUrl: string | null;
};

export type ProspectPreviewGenerateOptions = {
  colorVibe?: string;
  servicesLine?: string;
};

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

const STITCH_HELP_URL =
  typeof process.env.NEXT_PUBLIC_STITCH_APP_URL === "string" &&
  process.env.NEXT_PUBLIC_STITCH_APP_URL.trim()
    ? process.env.NEXT_PUBLIC_STITCH_APP_URL.trim()
    : "https://labs.google.com/fx/en/tools/stitch";

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
  canGenerate: boolean;
  /** Async so the button can show immediate loading until the server action finishes. */
  onGenerate: (opts?: ProspectPreviewGenerateOptions) => Promise<void>;
  generatePending: boolean;
  generateError: string | null;
  preview: ProspectPreviewOutreachSnapshot | null;
  smsDefaultTo: string;
  emailDefaultTo: string;
  facebookUrl: string | null;
  instagramUrl: string | null;
  /** When set, Stitch web/mobile cards use listing or URL branding context. */
  stitchContext?: ProspectStitchContext | null;
  /** Clears Stitch results when the active prospect report changes. */
  reportKey?: string;
};

export default function ProspectPreviewOutreachBlock({
  canGenerate,
  onGenerate,
  generatePending,
  generateError,
  preview,
  smsDefaultTo,
  emailDefaultTo,
  facebookUrl,
  instagramUrl,
  stitchContext = null,
  reportKey = "",
}: Props) {
  const [smsTemplate, setSmsTemplate] = useState(DEFAULT_SMS);
  const [emailSubj, setEmailSubj] = useState(DEFAULT_EMAIL_SUBJ);
  const [emailBody, setEmailBody] = useState(DEFAULT_EMAIL_BODY);
  const [yourName, setYourName] = useState("");
  const [smsTo, setSmsTo] = useState("");
  const [emailTo, setEmailTo] = useState("");
  const [shotUrl, setShotUrl] = useState<string | null>(null);
  const [shotStatus, setShotStatus] = useState<string>("pending");
  /** True after polling stops while status stayed pending (server never updated row). */
  const [shotPollTimedOut, setShotPollTimedOut] = useState(false);
  /** Iframe uses stable UUID URL on primary origin when available. */
  const [iframeSrc, setIframeSrc] = useState("");
  const [smsBusy, setSmsBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  /** True from click until onGenerate settles — parent loading can lag one frame. */
  const [generateClickPending, setGenerateClickPending] = useState(false);
  const [servicesOverride, setServicesOverride] = useState("");
  const [colorVibeOverride, setColorVibeOverride] = useState("");
  const [stitchWebBusy, setStitchWebBusy] = useState(false);
  const [stitchMobileBusy, setStitchMobileBusy] = useState(false);
  const [stitchWebResult, setStitchWebResult] = useState<StitchOk | null>(null);
  const [stitchMobileResult, setStitchMobileResult] = useState<StitchOk | null>(null);
  const [stitchWebError, setStitchWebError] = useState<string | null>(null);
  const [stitchMobileError, setStitchMobileError] = useState<string | null>(null);
  /** null = not loaded yet; false = STITCH_API_KEY missing on server (see GET /api/prospecting/stitch-config). */
  const [stitchApiConfigured, setStitchApiConfigured] = useState<boolean | null>(null);
  const [stitchConfigCheckFailed, setStitchConfigCheckFailed] = useState(false);
  const [stitchManualTarget, setStitchManualTarget] = useState<null | "website" | "mobile">(null);

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
          setStitchApiConfigured((data as { stitchApiKeyConfigured: boolean }).stitchApiKeyConfigured);
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
  }, []);

  useEffect(() => {
    setStitchWebBusy(false);
    setStitchMobileBusy(false);
    setStitchWebResult(null);
    setStitchMobileResult(null);
    setStitchWebError(null);
    setStitchMobileError(null);
  }, [reportKey]);

  useEffect(() => {
    setSmsTemplate(readLs(LS_SMS, DEFAULT_SMS));
    setEmailSubj(readLs(LS_EMAIL_SUBJ, DEFAULT_EMAIL_SUBJ));
    setEmailBody(readLs(LS_EMAIL_BODY, DEFAULT_EMAIL_BODY));
    setYourName(readLs(LS_YOUR_NAME, ""));
  }, []);

  /** Prefill “your name” with the prospect business for {{yourName}}; user can edit. */
  useEffect(() => {
    if (!preview?.businessName?.trim()) return;
    setYourName(preview.businessName.trim());
  }, [preview?.previewId]);

  useEffect(() => {
    setSmsTo(smsDefaultTo.trim());
  }, [smsDefaultTo]);

  useEffect(() => {
    setEmailTo(emailDefaultTo.trim());
  }, [emailDefaultTo]);

  useEffect(() => {
    if (!preview) {
      setShotUrl(null);
      setShotStatus("pending");
      setShotPollTimedOut(false);
      setIframeSrc("");
      return;
    }
    setShotUrl(preview.screenshotUrl);
    setShotStatus(preview.screenshotStatus);
    setShotPollTimedOut(false);
    setIframeSrc(preview.previewFrameUrl ?? preview.previewUrl);
  }, [
    preview?.previewId,
    preview?.previewFrameUrl,
    preview?.previewUrl,
    preview?.screenshotUrl,
    preview?.screenshotStatus,
  ]);

  useEffect(() => {
    if (!preview?.previewId) return;
    let cancelled = false;
    let attempts = 0;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      const r = await getProspectPreviewStatusAction(preview.previewId);
      if (cancelled || !r.ok) return;
      setShotUrl(r.screenshotUrl);
      setShotStatus(r.screenshotStatus);
      setIframeSrc(r.previewFrameUrl);
      attempts += 1;
      if (r.screenshotStatus === "pending") {
        if (cancelled) return;
        if (attempts < 45) {
          timeoutHandle = setTimeout(() => void poll(), 2500);
        } else {
          setShotPollTimedOut(true);
        }
      }
    };

    timeoutHandle = setTimeout(() => void poll(), 800);
    return () => {
      cancelled = true;
      if (timeoutHandle) clearTimeout(timeoutHandle);
    };
  }, [preview?.previewId]);

  const persistTemplates = useCallback(() => {
    writeLs(LS_SMS, smsTemplate);
    writeLs(LS_EMAIL_SUBJ, emailSubj);
    writeLs(LS_EMAIL_BODY, emailBody);
    writeLs(LS_YOUR_NAME, yourName);
  }, [smsTemplate, emailSubj, emailBody, yourName]);

  const composedForShare = preview
    ? mergeProspectOutreachTemplate(smsTemplate, {
        previewUrl: preview.previewUrl,
        businessName: preview.businessName,
        yourName,
      })
    : "";

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

  const fbHandoff = facebookUrl ? messengerHandoffUrlFromFacebook(facebookUrl) : null;
  const igUrl = instagramUrl ? instagramProfileUrl(instagramUrl) : null;

  const showSms = Boolean(smsTo.trim());
  const showEmail = Boolean(emailTo.trim());
  const showFb = Boolean(fbHandoff);
  const showIg = Boolean(igUrl);

  async function onSendSms() {
    if (!preview) return;
    setActionMsg(null);
    setSmsBusy(true);
    persistTemplates();
    const r = await sendProspectPreviewSmsAction({
      previewId: preview.previewId,
      to: smsTo.trim(),
      bodyTemplate: smsTemplate,
      businessName: preview.businessName,
      yourName: yourName.trim() || undefined,
      includeMmsImage: true,
    });
    setSmsBusy(false);
    if (!r.ok) {
      setActionMsg(r.error);
      return;
    }
    setActionMsg("warning" in r && r.warning ? r.warning : "SMS sent.");
  }

  async function onSendEmail() {
    if (!preview) return;
    setActionMsg(null);
    setEmailBusy(true);
    persistTemplates();
    const r = await sendProspectPreviewEmailAction({
      previewId: preview.previewId,
      to: emailTo.trim(),
      subjectTemplate: emailSubj,
      bodyTemplate: emailBody,
      businessName: preview.businessName,
      yourName: yourName.trim() || undefined,
    });
    setEmailBusy(false);
    if (!r.ok) {
      setActionMsg(r.error);
      return;
    }
    setActionMsg("Email sent.");
  }

  function mailtoFallbackHref() {
    if (!preview) return "#";
    const subj = mergeProspectOutreachTemplate(emailSubj, {
      previewUrl: preview.previewUrl,
      businessName: preview.businessName,
      yourName,
    });
    const body = mergeProspectOutreachTemplate(emailBody, {
      previewUrl: preview.previewUrl,
      businessName: preview.businessName,
      yourName,
    });
    return `mailto:${emailTo.trim()}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
  }

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
        if (
          !data ||
          typeof data !== "object" ||
          !("ok" in data) ||
          (data as { ok: unknown }).ok !== true ||
          typeof (data as { prompt: unknown }).prompt !== "string"
        ) {
          const err =
            data &&
            typeof data === "object" &&
            "error" in data &&
            typeof (data as { error: unknown }).error === "string"
              ? (data as { error: string }).error
              : "Could not build Stitch prompt.";
          setCopyMsg(err);
          setTimeout(() => setCopyMsg(null), 4000);
          return;
        }
        const d = data as { prompt: string; projectTitle?: string; deviceType?: string };
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
              <a
                href={stitchWebResult.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:underline dark:text-violet-300"
              >
                Open HTML export
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
            <a
              href={STITCH_HELP_URL}
              target="_blank"
              rel="noreferrer"
              className="block text-[11px] text-text-secondary hover:underline dark:text-zinc-500"
            >
              Open Google Stitch (find this project by title or ID)
            </a>
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <div className="space-y-4">
        <section
          className="rounded-xl border border-border/80 bg-surface/40 p-4 dark:border-zinc-700/70 dark:bg-zinc-900/50"
          aria-labelledby="prospect-offering-websites-heading"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3
              id="prospect-offering-websites-heading"
              className="text-xs font-semibold uppercase tracking-widest text-text-secondary/80 dark:text-zinc-500"
            >
              Custom Websites
            </h3>
            <p className="text-[10px] text-text-secondary/80 dark:text-zinc-500">
              Proposed site preview · Stitch · hosted HTML · share
            </p>
          </div>

      {!preview ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-text-secondary dark:text-zinc-400">
            Optional: use{" "}
            <span className="font-medium text-text-primary dark:text-zinc-200">Web app design (Stitch)</span> below for
            a desktop-sized UI concept (screenshot + HTML export), then run{" "}
            <span className="font-medium text-text-primary dark:text-zinc-200">Generate website preview</span> when you
            want the hosted one-pager for clients. The LLM builds full HTML/CSS; we host it, iframe it, capture a
            thumbnail, and you can share by SMS, email, or social handoff.
          </p>
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
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              disabled={!canGenerate || generatePending || generateClickPending}
              onClick={() => {
                if (!canGenerate) return;
                setGenerateClickPending(true);
                void (async () => {
                  try {
                    const o: ProspectPreviewGenerateOptions = {};
                    if (servicesOverride.trim()) o.servicesLine = servicesOverride.trim();
                    if (colorVibeOverride.trim()) o.colorVibe = colorVibeOverride.trim();
                    await onGenerate(
                      Object.keys(o).length > 0 ? o : undefined
                    );
                  } finally {
                    setGenerateClickPending(false);
                  }
                })();
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover disabled:opacity-50"
            >
              {generatePending || generateClickPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden />
              )}
              {generatePending || generateClickPending ? "Generating…" : "Generate website preview"}
            </button>
          </div>
          {generateError ? (
            <p className="text-xs text-red-600 dark:text-red-400" role="alert">
              {generateError}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={preview.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium hover:bg-surface dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              >
                Open preview
                <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden />
              </a>
              <button
                type="button"
                onClick={() => void copyAndFlash(preview.previewUrl)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface dark:border-zinc-600 dark:hover:bg-zinc-800"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                Copy link
              </button>
            </div>
            {preview.previewSlug ? (
              <p className="text-[11px] text-text-secondary dark:text-zinc-500">
                URL slug from business name:{" "}
                <span className="font-mono text-text-primary/90 dark:text-zinc-300">
                  {preview.previewSlug}
                </span>
              </p>
            ) : null}
          </div>

          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
              Live preview
            </p>
            <iframe
              title={`Site preview for ${preview.businessName}`}
              src={iframeSrc || preview.previewUrl}
              className="mt-2 h-[22rem] w-full max-w-2xl rounded-lg border border-border bg-white dark:border-zinc-700 dark:bg-zinc-950"
              sandbox="allow-same-origin"
            />
          </div>

          <div className="rounded-lg border border-dashed border-border/80 p-3 dark:border-zinc-700">
            <p className="text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
              Thumbnail
            </p>
            {shotStatus === "pending" && shotPollTimedOut ? (
              <p className="mt-2 text-xs text-amber-800 dark:text-amber-200/90">
                Screenshot never completed. Ensure{" "}
                <span className="font-mono">PUBLIC_APP_URL</span> is your live HTTPS app URL (Microlink must reach{" "}
                <span className="font-mono">/preview/&lt;id&gt;</span>), set{" "}
                <span className="font-mono">SUPABASE_SERVICE_ROLE_KEY</span> on the server, and optionally{" "}
                <span className="font-mono">MICROLINK_API_KEY</span>. Then generate a new preview.
              </p>
            ) : shotStatus === "pending" ? (
              <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary dark:text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Capturing screenshot…
              </div>
            ) : shotStatus === "failed" ? (
              <p className="mt-2 text-xs text-amber-800 dark:text-amber-200/90">
                Screenshot unavailable — Microlink could not render the page, or storage update failed. Check{" "}
                <span className="font-mono">PUBLIC_APP_URL</span>,{" "}
                <span className="font-mono">MICROLINK_API_KEY</span>, and deployment logs; generate again.
              </p>
            ) : shotUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- external screenshot URL
              <img
                src={shotUrl}
                alt="Preview thumbnail"
                className="mt-2 max-h-40 w-full max-w-sm rounded-lg border border-border object-cover object-top dark:border-zinc-700"
              />
            ) : null}
          </div>

          <div className="rounded-xl border border-border/90 bg-gradient-to-b from-surface/80 to-surface/40 p-4 shadow-sm dark:border-zinc-700/80 dark:from-zinc-900/60 dark:to-zinc-950/40">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
                  Share with client
                </h4>
                <p className="mt-0.5 text-xs text-text-secondary dark:text-zinc-500">
                  Templates support{" "}
                  <code className="rounded bg-border/40 px-1 py-px text-[10px] dark:bg-zinc-800">
                    {"{{previewUrl}}"}
                  </code>
                  ,{" "}
                  <code className="rounded bg-border/40 px-1 py-px text-[10px] dark:bg-zinc-800">
                    {"{{businessName}}"}
                  </code>
                  ,{" "}
                  <code className="rounded bg-border/40 px-1 py-px text-[10px] dark:bg-zinc-800">
                    {"{{yourName}}"}
                  </code>
                  .
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-6">
              <div className="space-y-1.5">
                <label
                  htmlFor="prospect-preview-your-name"
                  className="text-xs font-medium text-text-primary dark:text-zinc-300"
                >
                  Name in message
                </label>
                <p className="text-[11px] text-text-secondary dark:text-zinc-500">
                  Fills <span className="font-mono">{"{{yourName}}"}</span> in SMS and email. Defaults to this business;
                  change if you want a different sign-off.
                </p>
                <input
                  id="prospect-preview-your-name"
                  value={yourName}
                  onChange={(e) => setYourName(e.target.value)}
                  onBlur={persistTemplates}
                  className="w-full max-w-lg rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none ring-accent/0 transition-shadow focus:border-accent/50 focus:ring-2 focus:ring-accent/20 dark:border-zinc-600 dark:bg-zinc-900"
                />
              </div>

              <section
                aria-labelledby="prospect-share-sms-heading"
                className="rounded-xl border border-border/90 bg-white/50 p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/35"
              >
                <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3 dark:border-zinc-700">
                  <MessageCircle className="h-4 w-4 text-accent dark:text-blue-400" aria-hidden />
                  <h5
                    id="prospect-share-sms-heading"
                    className="text-sm font-semibold text-text-primary dark:text-zinc-100"
                  >
                    SMS &amp; social
                  </h5>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="prospect-preview-sms-template"
                      className="text-xs font-medium text-text-primary dark:text-zinc-300"
                    >
                      Message template
                    </label>
                    <p className="text-[11px] text-text-secondary dark:text-zinc-500">
                      Used for SMS and when you copy for Messenger or Instagram.
                    </p>
                    <textarea
                      id="prospect-preview-sms-template"
                      value={smsTemplate}
                      onChange={(e) => setSmsTemplate(e.target.value)}
                      onBlur={persistTemplates}
                      rows={4}
                      className="w-full rounded-lg border border-border bg-white px-3 py-2.5 font-mono text-xs leading-relaxed outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 dark:border-zinc-600 dark:bg-zinc-900"
                    />
                  </div>

                  {showSms ? (
                    <div className="space-y-2 rounded-lg border border-dashed border-border/90 bg-white/60 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
                      <label
                        htmlFor="prospect-preview-sms-to"
                        className="text-xs font-medium text-text-primary dark:text-zinc-300"
                      >
                        Recipient phone
                      </label>
                      <input
                        id="prospect-preview-sms-to"
                        type="tel"
                        value={smsTo}
                        onChange={(e) => setSmsTo(e.target.value)}
                        placeholder="+1… or E.164"
                        className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 dark:border-zinc-600 dark:bg-zinc-900"
                      />
                      <button
                        type="button"
                        disabled={smsBusy || !smsTo.trim()}
                        onClick={() => void onSendSms()}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-50"
                      >
                        {smsBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Send className="h-4 w-4" aria-hidden />
                        )}
                        Send SMS
                      </button>
                    </div>
                  ) : (
                    <p className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-900 dark:text-amber-200/90">
                      Add a phone number on the lead or listing to send SMS from here.
                    </p>
                  )}

                  {(showFb || showIg) && (
                    <div className="border-t border-border/60 pt-4 dark:border-zinc-800">
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                        Social handoff
                      </p>
                      <p className="mb-3 text-xs text-text-secondary dark:text-zinc-500">
                        Copies your message, then opens the app so you can paste and send.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {showFb ? (
                          <button
                            type="button"
                            onClick={() => {
                              void copyAndFlash(composedForShare);
                              window.open(fbHandoff ?? "", "_blank", "noopener,noreferrer");
                            }}
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium shadow-sm hover:bg-surface dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                          >
                            <MessageCircle className="h-4 w-4" aria-hidden />
                            Messenger
                          </button>
                        ) : null}
                        {showIg ? (
                          <button
                            type="button"
                            onClick={() => {
                              void copyAndFlash(composedForShare);
                              window.open(igUrl ?? "", "_blank", "noopener,noreferrer");
                            }}
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium shadow-sm hover:bg-surface dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                          >
                            Instagram
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section
                aria-labelledby="prospect-share-email-heading"
                className="rounded-xl border border-border/90 bg-white/50 p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/35"
              >
                <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3 dark:border-zinc-700">
                  <Mail className="h-4 w-4 text-accent dark:text-blue-400" aria-hidden />
                  <h5
                    id="prospect-share-email-heading"
                    className="text-sm font-semibold text-text-primary dark:text-zinc-100"
                  >
                    Email
                  </h5>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="prospect-preview-email-subj"
                      className="text-xs font-medium text-text-primary dark:text-zinc-300"
                    >
                      Subject line
                    </label>
                    <input
                      id="prospect-preview-email-subj"
                      value={emailSubj}
                      onChange={(e) => setEmailSubj(e.target.value)}
                      onBlur={persistTemplates}
                      className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 dark:border-zinc-600 dark:bg-zinc-900"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="prospect-preview-email-body"
                      className="text-xs font-medium text-text-primary dark:text-zinc-300"
                    >
                      Email body
                    </label>
                    <textarea
                      id="prospect-preview-email-body"
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      onBlur={persistTemplates}
                      rows={6}
                      className="w-full rounded-lg border border-border bg-white px-3 py-2.5 font-mono text-xs leading-relaxed outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 dark:border-zinc-600 dark:bg-zinc-900"
                    />
                  </div>

                  {showEmail ? (
                    <div className="space-y-2 rounded-lg border border-dashed border-border/90 bg-white/60 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
                      <label
                        htmlFor="prospect-preview-email-to"
                        className="text-xs font-medium text-text-primary dark:text-zinc-300"
                      >
                        Recipient email
                      </label>
                      <input
                        id="prospect-preview-email-to"
                        type="email"
                        value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 dark:border-zinc-600 dark:bg-zinc-900"
                      />
                      <button
                        type="button"
                        disabled={emailBusy || !emailTo.trim()}
                        onClick={() => void onSendEmail()}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-3 text-sm font-semibold shadow-sm transition-colors hover:bg-surface disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                      >
                        {emailBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Mail className="h-4 w-4" aria-hidden />
                        )}
                        Send with Resend
                      </button>
                      <a
                        href={mailtoFallbackHref()}
                        className="block text-center text-xs font-medium text-accent hover:underline dark:text-blue-400"
                      >
                        Open in default mail app instead
                      </a>
                    </div>
                  ) : (
                    <p className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-900 dark:text-amber-200/90">
                      Add an email in the Lead section above to enable Resend and the mail-app shortcut from here.
                    </p>
                  )}
                </div>
              </section>
            </div>
          </div>

          {actionMsg ? (
            <p className="text-xs text-text-secondary dark:text-zinc-400" role="status">
              {actionMsg}
            </p>
          ) : null}
          {copyMsg ? (
            <p className="text-xs text-emerald-700 dark:text-emerald-400" role="status">
              {copyMsg}
            </p>
          ) : null}
        </div>
      )}
        </section>

        {stitchContext && stitchApiConfigured === false ? (
          <div className="rounded-xl border border-amber-500/35 bg-amber-500/[0.07] p-3 dark:border-amber-500/25 dark:bg-amber-500/10">
            <p className="text-xs font-semibold text-amber-950 dark:text-amber-100/95">
              Stitch server key not configured
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-amber-900/95 dark:text-amber-200/85">
              Cursor&apos;s Google Stitch MCP does not set credentials for this app. Add the same Google API key (Stitch
              API enabled) to <span className="font-mono">.env.local</span> and Vercel as{" "}
              <span className="font-mono">STITCH_API_KEY</span>, then restart dev or redeploy — see{" "}
              <span className="font-mono">.env.example</span>. Or use{" "}
              <span className="font-medium">Copy prompt &amp; open Google Stitch</span> in Web and Mobile below (no server
              key required).
            </p>
          </div>
        ) : null}
        {stitchContext && stitchConfigCheckFailed ? (
          <p className="text-[11px] text-text-secondary dark:text-zinc-500" role="status">
            Could not verify Stitch configuration; one-click generate may still work if the key is set on the server.
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
                Open a <span className="font-medium text-text-primary dark:text-zinc-200">Local Business</span> listing
                or run <span className="font-medium text-text-primary dark:text-zinc-200">URL research</span> above to
                enable Stitch with branding context.
              </>
            )}
          </p>
          {stitchContext ? (
            <p className="mt-2 rounded-lg border border-border/60 bg-white/40 px-2.5 py-2 text-[11px] text-text-secondary dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
              {stitchBrandingSummary(stitchContext)}
            </p>
          ) : null}
          <p className="mt-2 text-[11px] text-text-secondary/90 dark:text-zinc-500">
            Generation often takes a few minutes. Do not double-click — the Stitch API may still complete if the request
            times out at the edge.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              disabled={!stitchContext || stitchWebBusy || stitchApiConfigured === false}
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
                Open a <span className="font-medium text-text-primary dark:text-zinc-200">Local Business</span> listing
                or run <span className="font-medium text-text-primary dark:text-zinc-200">URL research</span> above to
                enable Stitch with branding context.
              </>
            )}
          </p>
          {stitchContext ? (
            <p className="mt-2 rounded-lg border border-border/60 bg-white/40 px-2.5 py-2 text-[11px] text-text-secondary dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
              {stitchBrandingSummary(stitchContext)}
            </p>
          ) : null}
          <p className="mt-2 text-[11px] text-text-secondary/90 dark:text-zinc-500">
            Generation often takes a few minutes. Do not double-click — the Stitch API may still complete if the request
            times out at the edge.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              disabled={!stitchContext || stitchMobileBusy || stitchApiConfigured === false}
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
                <a
                  href={stitchMobileResult.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:underline dark:text-violet-300"
                >
                  Open HTML export
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
              <a
                href={STITCH_HELP_URL}
                target="_blank"
                rel="noreferrer"
                className="block text-[11px] text-text-secondary hover:underline dark:text-zinc-500"
              >
                Open Google Stitch (find this project by title or ID)
              </a>
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
