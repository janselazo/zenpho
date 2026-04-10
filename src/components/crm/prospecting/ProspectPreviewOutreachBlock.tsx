"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  ExternalLink,
  FileDown,
  Instagram,
  LayoutDashboard,
  Loader2,
  Mail,
  MessageSquare,
  Monitor,
  Smartphone,
  Video,
  Workflow,
} from "lucide-react";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import type { MarketIntelReport } from "@/lib/crm/prospect-intel-report";
import type {
  StitchProspectDesignPayload,
  StitchProspectDesignResult,
} from "@/lib/crm/stitch-prospect-design-types";
import {
  stitchWithGoogleAppHomeUrl,
  stitchWithGoogleProjectUrl,
} from "@/lib/crm/stitch-withgoogle-url";
import {
  sendProspectPreviewEmailAction,
  sendProspectPreviewSmsAction,
} from "@/app/(crm)/actions/prospect-preview";
import { generateProspectAutomationPdfAction } from "@/app/(crm)/actions/prospect-automation-report";
import { mergeProspectOutreachTemplate } from "@/lib/crm/prospect-outreach-template";
import {
  downloadBlob,
  recordProspectPreviewScrollVideo,
  type PreviewDeviceTypeForVideo,
} from "@/lib/crm/stitch-preview-scroll-video";

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
type StitchTarget = "website" | "webapp" | "mobile";
type SelectedOffer = StitchTarget | "automations";

const STITCH_HELP_URL = stitchWithGoogleAppHomeUrl();

function buildClientPreviewLink(previewId: string, slug: string | null | undefined): string {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  const s = slug?.trim();
  if (s) return `${origin}/preview/${encodeURIComponent(s)}`;
  return `${origin}/preview/${encodeURIComponent(previewId)}`;
}

/** Profile URL for opening in a new tab; accepts full https URL or @handle. */
function normalizeInstagramProfileUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      const h = u.hostname.replace(/^www\./i, "").toLowerCase();
      if (h !== "instagram.com") return null;
      u.hash = "";
      let out = u.toString();
      if (out.endsWith("/")) out = out.slice(0, -1);
      return out;
    } catch {
      return null;
    }
  }
  const handle = t.replace(/^@/, "").replace(/\/+$/, "").trim();
  if (/^[a-z0-9._]{1,190}$/i.test(handle)) {
    return `https://www.instagram.com/${handle}/`;
  }
  return null;
}

type ShareTemplates = {
  smsBody: string;
  emailSubject: string;
  emailBody: string;
  /** Short DM-style copy; Instagram has no third-party “send DM” API — user pastes in the app. */
  instagramBody: string;
};

function defaultShareTemplatesForOffer(offer: SelectedOffer): ShareTemplates {
  switch (offer) {
    case "website":
      return {
        smsBody:
          "Hi — we put together a quick visual direction for {{businessName}}'s site. Peek when you can:\n\n{{previewUrl}}\n\nHappy to walk through it live or tweak from your feedback.",
        emailSubject: "A website concept we drafted for {{businessName}}",
        emailBody:
          "Hi —\n\nFollowing up on our research, here's a hosted preview with one possible direction for {{businessName}}'s marketing site — desktop-first, brochure-style layout:\n\n{{previewUrl}}\n\nTotally fine if now isn't the time. If it's useful, I can review it with you on a short call or iterate based on what you're aiming for.\n\nBest,\n{{yourName}}",
        instagramBody:
          "Hi! Quick website concept preview for {{businessName}} 👇\n\n{{previewUrl}}\n\nHappy to walk through it if useful.\n\n— {{yourName}}",
      };
    case "webapp":
      return {
        smsBody:
          "Hi — sharing an internal-style web app UI preview for {{businessName}} (dashboards / tools, not a brochure):\n\n{{previewUrl}}\n\nReply if you want a quick tour of the flows.",
        emailSubject: "Web app UI concept for {{businessName}}",
        emailBody:
          "Hi —\n\nHere's a desktop web application UI preview for {{businessName}} — think operator workflows: navigation, tables, and task-focused screens rather than a marketing site:\n\n{{previewUrl}}\n\nIf it resonates, we can dig into user journeys, what's MVP vs. later, and how this could sit alongside your stack.\n\nBest,\n{{yourName}}",
        instagramBody:
          "Hi! Sharing a web app UI preview for {{businessName}} (operator-style dashboards):\n\n{{previewUrl}}\n\nWant a quick tour of the flows?\n\n— {{yourName}}",
      };
    case "mobile":
      return {
        smsBody:
          "Hi — here's a phone-sized app UI preview for {{businessName}}:\n\n{{previewUrl}}\n\nGeared toward day-to-day tasks on the go. Say the word if you want a quick walkthrough.",
        emailSubject: "Mobile app UI concept for {{businessName}}",
        emailBody:
          "Hi —\n\nSharing a mobile app UI preview for {{businessName}} — phone-sized screens oriented around real on-the-ground use, not just a pretty mock:\n\n{{previewUrl}}\n\nHappy to talk through priorities, what to build first, and how this could evolve.\n\nBest,\n{{yourName}}",
        instagramBody:
          "Hi! Phone-sized app UI preview for {{businessName}}:\n\n{{previewUrl}}\n\nSay the word if you want a quick walkthrough.\n\n— {{yourName}}",
      };
    case "automations":
      return {
        smsBody:
          "Hi — we drafted an AI audit for {{businessName}}: repeatable processes, where time/money goes, and prioritized next steps (implementation quoted separately). Want the PDF or a quick call to walk through it?",
        emailSubject: "AI audit for {{businessName}}",
        emailBody:
          "Hi —\n\nFrom our research on {{businessName}}, we put together a structured AI audit — map repeatable processes, spot the highest time/money costs, and recommend tools and workflows. You get a prioritized action plan; building or rolling out systems is scoped separately if you want to move forward.\n\nI can send the PDF or walk through it on a short call.\n\n(Hosted preview links are for Website / Web app / Mobile concepts. For this track, use Generate report (PDF) on the AI audit card.)\n\nBest,\n{{yourName}}",
        instagramBody:
          "Hi! AI audit draft for {{businessName}} — processes, cost hotspots, recommended tools/workflows, and a prioritized plan (implementation is a separate step). Want the PDF or a quick call?\n\n— {{yourName}}",
      };
  }
}

function createInitialShareTemplates(): Record<SelectedOffer, ShareTemplates> {
  return {
    website: defaultShareTemplatesForOffer("website"),
    webapp: defaultShareTemplatesForOffer("webapp"),
    mobile: defaultShareTemplatesForOffer("mobile"),
    automations: defaultShareTemplatesForOffer("automations"),
  };
}

function stitchBrandingSummary(ctx: ProspectStitchContext): string {
  if (ctx.kind === "place") {
    const p = ctx.place;
    const bits = [p.name, p.formattedAddress].filter((x) => x?.trim());
    return bits.length ? bits.join(" · ") : p.name;
  }
  const title = ctx.pageTitle?.trim();
  return title ? `${title} · ${ctx.url}` : ctx.url;
}

async function downloadStitchPreviewImage(
  imageUrl: string,
  target: StitchTarget,
  screenId: string,
  onFallback: () => void,
): Promise<void> {
  const safeId = screenId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "preview";
  const base = `stitch-preview-${target}-${safeId}`;
  try {
    const res = await fetch(imageUrl, { mode: "cors" });
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const ct = (blob.type || res.headers.get("content-type") || "").toLowerCase();
    const ext = ct.includes("jpeg") || ct.includes("jpg") ? "jpg" : "png";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${base}.${ext}`;
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    window.open(imageUrl, "_blank", "noopener,noreferrer");
    onFallback();
  }
}

function StitchPreviewLinks({
  result,
  label,
  target,
  copyAndFlash,
}: {
  result: StitchOk;
  label: string;
  target: StitchTarget;
  copyAndFlash: (t: string) => void;
}) {
  const [imageDownloadBusy, setImageDownloadBusy] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [sessionVideoUrl, setSessionVideoUrl] = useState<string | null>(null);
  const sessionVideoUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (sessionVideoUrlRef.current) {
        URL.revokeObjectURL(sessionVideoUrlRef.current);
        sessionVideoUrlRef.current = null;
      }
    };
  }, []);

  const hostedId = result.hostedPreviewId?.trim();
  const canScrollVideo = Boolean(hostedId);

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-blue-500/25 bg-blue-500/[0.06] p-3 dark:border-blue-400/20 dark:bg-blue-500/10">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-900/80 dark:text-blue-200/90">
        {label}
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element -- Stitch CDN screenshot URL */}
      <img
        src={result.imageUrl}
        alt=""
        className="max-h-40 w-full rounded-md border border-border object-contain object-top dark:border-zinc-700"
      />
      {sessionVideoUrl ? (
        <video
          className="max-h-48 w-full rounded-md border border-border object-contain dark:border-zinc-700"
          src={sessionVideoUrl}
          controls
          playsInline
          muted
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        {result.hostedPreviewUrl ? (
          <a
            href={result.hostedPreviewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-800 hover:underline dark:text-blue-200"
          >
            Open hosted preview
            <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
          </a>
        ) : null}
        <a
          href={stitchWithGoogleProjectUrl(result.projectId)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline dark:text-blue-300"
        >
          Open in Stitch
          <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
        </a>
        <a
          href={result.htmlUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary hover:underline dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          Download HTML
          <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
        </a>
        <button
          type="button"
          disabled={imageDownloadBusy}
          onClick={() => {
            setImageDownloadBusy(true);
            void downloadStitchPreviewImage(result.imageUrl, target, result.screenId, () =>
              copyAndFlash("Opened preview image in a new tab — use Save Image As if needed."),
            ).finally(() => setImageDownloadBusy(false));
          }}
          className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary disabled:opacity-50 dark:text-zinc-400"
        >
          {imageDownloadBusy ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          ) : (
            <FileDown className="h-3 w-3" aria-hidden />
          )}
          Download image
        </button>
        <button
          type="button"
          disabled={!canScrollVideo || videoBusy}
          title={
            canScrollVideo
              ? "Builds a short WebM by scrolling the hosted preview (can take a minute)."
              : "Hosted preview is required — generate again or check preview hosting."
          }
          onClick={() => {
            if (!hostedId) return;
            setVideoError(null);
            setVideoBusy(true);
            void (async () => {
              try {
                const res = await fetch(
                  `/api/prospecting/preview-html?previewId=${encodeURIComponent(hostedId)}`,
                  { credentials: "same-origin" },
                );
                const data = (await res.json()) as {
                  ok?: boolean;
                  html?: string;
                  deviceType?: PreviewDeviceTypeForVideo;
                  error?: string;
                };
                if (!res.ok || !data.ok || !data.html?.trim()) {
                  throw new Error(data.error || "Could not load preview HTML.");
                }
                const safeId = result.screenId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "preview";
                const fileBase = `stitch-preview-${target}-${safeId}`;
                const blob = await recordProspectPreviewScrollVideo({
                  html: data.html,
                  deviceType: data.deviceType ?? null,
                });
                if (sessionVideoUrlRef.current) {
                  URL.revokeObjectURL(sessionVideoUrlRef.current);
                }
                const vUrl = URL.createObjectURL(blob);
                sessionVideoUrlRef.current = vUrl;
                setSessionVideoUrl(vUrl);
                downloadBlob(blob, `${fileBase}-scroll.webm`);
              } catch (e) {
                const msg = e instanceof Error ? e.message : "Could not record scroll video.";
                setVideoError(msg);
                copyAndFlash(msg);
              } finally {
                setVideoBusy(false);
              }
            })();
          }}
          className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary disabled:opacity-50 dark:text-zinc-400"
        >
          {videoBusy ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          ) : (
            <Video className="h-3 w-3" aria-hidden />
          )}
          {videoBusy ? "Generating video…" : "Download video"}
        </button>
        <button
          type="button"
          onClick={() =>
            void copyAndFlash(
              `Project: ${result.projectId}\nScreen: ${result.screenId}\n${result.projectTitle}`
            )
          }
          className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary dark:text-zinc-400"
        >
          <Copy className="h-3 w-3" aria-hidden />
          Copy project &amp; screen IDs
        </button>
      </div>
      {!canScrollVideo ? (
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
          Download video needs a hosted preview (saved when Stitch generation succeeds).
        </p>
      ) : null}
      {videoError ? (
        <p className="text-[11px] text-red-600 dark:text-red-400">{videoError}</p>
      ) : null}
    </div>
  );
}

type Props = {
  stitchContext?: ProspectStitchContext | null;
  reportKey?: string;
  /** Display name for merge tags and PDF title. */
  businessName?: string;
  contactPhone?: string;
  contactEmail?: string;
  /** Instagram profile URL or @handle (e.g. from enrichment). */
  contactInstagram?: string;
  yourName?: string;
  marketIntelReport?: MarketIntelReport | null;
};

export default function ProspectPreviewOutreachBlock({
  stitchContext = null,
  reportKey = "",
  businessName: businessNameProp = "",
  contactPhone = "",
  contactEmail = "",
  contactInstagram = "",
  yourName = "",
  marketIntelReport = null,
}: Props) {
  const [stitchWebBusy, setStitchWebBusy] = useState(false);
  const [stitchWebAppBusy, setStitchWebAppBusy] = useState(false);
  const [stitchMobileBusy, setStitchMobileBusy] = useState(false);
  const [stitchWebResult, setStitchWebResult] = useState<StitchOk | null>(null);
  const [stitchWebAppResult, setStitchWebAppResult] = useState<StitchOk | null>(null);
  const [stitchMobileResult, setStitchMobileResult] = useState<StitchOk | null>(null);
  const [stitchWebError, setStitchWebError] = useState<string | null>(null);
  const [stitchWebAppError, setStitchWebAppError] = useState<string | null>(null);
  const [stitchMobileError, setStitchMobileError] = useState<string | null>(null);
  const [stitchApiConfigured, setStitchApiConfigured] = useState<boolean | null>(null);
  const [stitchLinkedProjectConfigured, setStitchLinkedProjectConfigured] = useState(false);
  const [stitchConfigCheckFailed, setStitchConfigCheckFailed] = useState(false);
  const [stitchManualTarget, setStitchManualTarget] = useState<null | StitchTarget>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<SelectedOffer>("website");

  const [smsTo, setSmsTo] = useState(contactPhone);
  const [emailTo, setEmailTo] = useState(contactEmail);
  const [instagramTo, setInstagramTo] = useState(contactInstagram);
  const [shareTemplates, setShareTemplates] = useState(createInitialShareTemplates);
  const [attachPreviewImage, setAttachPreviewImage] = useState(true);
  const [shareBusy, setShareBusy] = useState<null | "sms" | "email">(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfMsg, setPdfMsg] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string | null>(null);

  const resolvedBusinessName = useMemo(() => {
    const t = businessNameProp.trim();
    if (t) return t;
    if (stitchContext?.kind === "place") return stitchContext.place.name.trim() || "Business";
    if (stitchContext?.kind === "url") {
      const title = stitchContext.pageTitle?.trim();
      if (title) return title;
      try {
        return new URL(
          /^https?:\/\//i.test(stitchContext.url) ? stitchContext.url : `https://${stitchContext.url}`
        ).hostname.replace(/^www\./i, "");
      } catch {
        return "Business";
      }
    }
    return "Business";
  }, [businessNameProp, stitchContext]);

  const activeShareTpl = shareTemplates[selectedOffer];

  const updateActiveShareTemplates = useCallback(
    (patch: Partial<ShareTemplates>) => {
      setShareTemplates((prev) => ({
        ...prev,
        [selectedOffer]: { ...prev[selectedOffer], ...patch },
      }));
    },
    [selectedOffer]
  );

  useEffect(() => {
    setSmsTo(contactPhone);
  }, [contactPhone]);

  useEffect(() => {
    setEmailTo(contactEmail);
  }, [contactEmail]);

  useEffect(() => {
    setInstagramTo(contactInstagram);
  }, [contactInstagram]);

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
    setStitchWebAppBusy(false);
    setStitchMobileBusy(false);
    setStitchWebResult(null);
    setStitchWebAppResult(null);
    setStitchMobileResult(null);
    setStitchWebError(null);
    setStitchWebAppError(null);
    setStitchMobileError(null);
    setSelectedOffer("website");
    setShareTemplates(createInitialShareTemplates());
    setShareMsg(null);
    setPdfMsg(null);
    setPdfFilename(null);
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

  const buildStitchPayload = useCallback(
    (target: StitchTarget): StitchProspectDesignPayload | null => {
      if (!stitchContext) return null;
      if (stitchContext.kind === "place") {
        return { target, kind: "place", place: stitchContext.place };
      }
      return {
        target,
        kind: "url",
        url: stitchContext.url,
        pageTitle: stitchContext.pageTitle,
        metaDescription: stitchContext.metaDescription,
      };
    },
    [stitchContext]
  );

  const copyStitchPromptManual = useCallback(
    async (target: StitchTarget) => {
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
    [buildStitchPayload]
  );

  const setBusyForTarget = (target: StitchTarget, v: boolean) => {
    if (target === "website") setStitchWebBusy(v);
    else if (target === "webapp") setStitchWebAppBusy(v);
    else setStitchMobileBusy(v);
  };

  const setErrorForTarget = (target: StitchTarget, e: string | null) => {
    if (target === "website") setStitchWebError(e);
    else if (target === "webapp") setStitchWebAppError(e);
    else setStitchMobileError(e);
  };

  const setResultForTarget = (target: StitchTarget, r: StitchOk | null) => {
    if (target === "website") setStitchWebResult(r);
    else if (target === "webapp") setStitchWebAppResult(r);
    else setStitchMobileResult(r);
  };

  const runStitchDesign = useCallback(
    async (target: StitchTarget) => {
      const payload = buildStitchPayload(target);
      if (!payload) return;
      setBusyForTarget(target, true);
      setErrorForTarget(target, null);
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
          setErrorForTarget(target, "Invalid response from Stitch API.");
          setResultForTarget(target, null);
          return;
        }
        if (!r.ok) {
          if ("code" in r && r.code === "STITCH_API_KEY_MISSING") {
            setStitchApiConfigured(false);
          }
          setErrorForTarget(target, r.error);
          setResultForTarget(target, null);
          return;
        }
        setStitchApiConfigured(true);
        setResultForTarget(target, r);
        setSelectedOffer(target);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Stitch request failed.";
        setErrorForTarget(target, msg);
        setResultForTarget(target, null);
      } finally {
        setBusyForTarget(target, false);
      }
    },
    [buildStitchPayload]
  );

  const hostedPreviewIdForSelection = useMemo(() => {
    if (selectedOffer === "website") return stitchWebResult?.hostedPreviewId?.trim() || null;
    if (selectedOffer === "webapp") return stitchWebAppResult?.hostedPreviewId?.trim() || null;
    if (selectedOffer === "mobile") return stitchMobileResult?.hostedPreviewId?.trim() || null;
    return null;
  }, [selectedOffer, stitchWebResult, stitchWebAppResult, stitchMobileResult]);

  const stitchPreviewImageUrlForSelection = useMemo(() => {
    if (selectedOffer === "website") return stitchWebResult?.imageUrl?.trim() || undefined;
    if (selectedOffer === "webapp") return stitchWebAppResult?.imageUrl?.trim() || undefined;
    if (selectedOffer === "mobile") return stitchMobileResult?.imageUrl?.trim() || undefined;
    return undefined;
  }, [selectedOffer, stitchWebResult, stitchWebAppResult, stitchMobileResult]);

  const hostedPreviewSlugForSelection = useMemo(() => {
    if (selectedOffer === "website") return stitchWebResult?.hostedPreviewSlug?.trim() || null;
    if (selectedOffer === "webapp") return stitchWebAppResult?.hostedPreviewSlug?.trim() || null;
    if (selectedOffer === "mobile") return stitchMobileResult?.hostedPreviewSlug?.trim() || null;
    return null;
  }, [selectedOffer, stitchWebResult, stitchWebAppResult, stitchMobileResult]);

  const canSharePreview =
    selectedOffer !== "automations" && Boolean(hostedPreviewIdForSelection && resolvedBusinessName);

  const mergedInstagramMessage = useMemo(() => {
    const id = hostedPreviewIdForSelection;
    const previewUrl =
      selectedOffer === "automations"
        ? ""
        : id
          ? buildClientPreviewLink(id, hostedPreviewSlugForSelection)
          : "";
    return mergeProspectOutreachTemplate(activeShareTpl.instagramBody, {
      previewUrl,
      businessName: resolvedBusinessName,
      yourName: yourName.trim(),
    });
  }, [
    selectedOffer,
    hostedPreviewIdForSelection,
    hostedPreviewSlugForSelection,
    activeShareTpl.instagramBody,
    resolvedBusinessName,
    yourName,
  ]);

  const canCopyInstagramMessage =
    selectedOffer === "automations" || (Boolean(hostedPreviewIdForSelection) && Boolean(resolvedBusinessName));

  const sendSms = useCallback(async () => {
    const id = hostedPreviewIdForSelection;
    if (!id || !smsTo.trim()) {
      setShareMsg("Add a phone number and select a card with a hosted preview.");
      return;
    }
    setShareBusy("sms");
    setShareMsg(null);
    const res = await sendProspectPreviewSmsAction({
      previewId: id,
      to: smsTo.trim(),
      bodyTemplate: shareTemplates[selectedOffer].smsBody,
      businessName: resolvedBusinessName,
      yourName: yourName.trim() || undefined,
      includeMmsImage: attachPreviewImage,
      stitchPreviewImageUrl: stitchPreviewImageUrlForSelection,
    });
    setShareBusy(null);
    if (res.ok) {
      setShareMsg("warning" in res && res.warning ? res.warning : "SMS sent.");
    } else {
      setShareMsg(res.error);
    }
  }, [
    hostedPreviewIdForSelection,
    stitchPreviewImageUrlForSelection,
    selectedOffer,
    shareTemplates,
    smsTo,
    resolvedBusinessName,
    yourName,
    attachPreviewImage,
  ]);

  const sendEmail = useCallback(async () => {
    const id = hostedPreviewIdForSelection;
    if (!id || !emailTo.trim()) {
      setShareMsg("Add an email address and select a card with a hosted preview.");
      return;
    }
    setShareBusy("email");
    setShareMsg(null);
    const res = await sendProspectPreviewEmailAction({
      previewId: id,
      to: emailTo.trim(),
      subjectTemplate: shareTemplates[selectedOffer].emailSubject,
      bodyTemplate: shareTemplates[selectedOffer].emailBody,
      businessName: resolvedBusinessName,
      yourName: yourName.trim() || undefined,
      stitchPreviewImageUrl: stitchPreviewImageUrlForSelection,
    });
    setShareBusy(null);
    if (res.ok) {
      setShareMsg("Email sent.");
    } else {
      setShareMsg(res.error);
    }
  }, [
    hostedPreviewIdForSelection,
    stitchPreviewImageUrlForSelection,
    selectedOffer,
    shareTemplates,
    emailTo,
    resolvedBusinessName,
    yourName,
  ]);

  const copyInstagramMessage = useCallback(async () => {
    if (!canCopyInstagramMessage) {
      setShareMsg(
        "Generate a hosted preview and keep Website, Web app, or Mobile selected to include {{previewUrl}}, or choose AI audit for a text-only message.",
      );
      return;
    }
    setShareMsg(null);
    try {
      await navigator.clipboard.writeText(mergedInstagramMessage);
      setShareMsg(
        "Instagram message copied. Open Instagram, start a DM with this business, and paste. Meta does not offer a one-click third-party DM API for arbitrary recipients.",
      );
    } catch {
      setShareMsg("Could not copy (browser blocked).");
    }
  }, [canCopyInstagramMessage, mergedInstagramMessage]);

  const openInstagramProfile = useCallback(() => {
    const url = normalizeInstagramProfileUrl(instagramTo);
    if (!url) {
      setShareMsg("Enter their Instagram profile URL (https://instagram.com/…) or @handle.");
      return;
    }
    setShareMsg(null);
    window.open(url, "_blank", "noopener,noreferrer");
  }, [instagramTo]);

  const generatePdf = useCallback(async () => {
    if (!marketIntelReport) {
      setPdfMsg("No market intel report loaded.");
      return;
    }
    setPdfBusy(true);
    setPdfMsg(null);
    try {
      const res = await generateProspectAutomationPdfAction({
        report: marketIntelReport,
        businessName: resolvedBusinessName,
      });
      if (!res.ok) {
        setPdfMsg(res.error);
        return;
      }
      setPdfFilename(res.filename);
      setPdfMsg("Report downloaded.");
      try {
        const bin = atob(res.pdfBase64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.filename;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        setPdfMsg("Could not start download in this browser.");
      }
    } catch (e) {
      setPdfMsg(e instanceof Error ? e.message : "PDF request failed.");
    } finally {
      setPdfBusy(false);
    }
  }, [marketIntelReport, resolvedBusinessName]);

  /** Inset ring only — avoids `ring-offset-*` painting outside the card (some browsers composite that oddly). */
  const cardRing = (key: SelectedOffer) =>
    selectedOffer === key
      ? "ring-2 ring-inset ring-blue-500/50 dark:ring-blue-400/40"
      : "";

  const placeVsUrlIntro =
    stitchContext?.kind === "place" ? (
      <>
        Uses your{" "}
        <span className="font-medium text-text-primary dark:text-zinc-200">Google Business Profile</span> (name,
        address, categories, rating, listing website) as branding context.
      </>
    ) : stitchContext ? (
      <>
        URL research only — brand context from page title and meta. Open a{" "}
        <span className="font-medium text-text-primary dark:text-zinc-200">Local Business</span> listing for full
        profile fields.
      </>
    ) : (
      <>
        Open a <span className="font-medium text-text-primary dark:text-zinc-200">Local Business</span> listing or run{" "}
        <span className="font-medium text-text-primary dark:text-zinc-200">URL research</span> above.
      </>
    );

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
            Add <span className="font-mono">STITCH_API_KEY</span> to env, restart dev, or use{" "}
            <span className="font-medium">Copy prompt &amp; open Google Stitch</span> — see{" "}
            <span className="font-mono">.env.example</span>.
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
          New Stitch screens use <span className="font-mono">STITCH_PROJECT_ID</span> when set on the server.
        </p>
      ) : null}

      <div className="rounded-xl border border-border/80 bg-surface/30 p-4 dark:border-zinc-700/70 dark:bg-zinc-900/40">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-text-secondary/80 dark:text-zinc-500">
          Design concepts &amp; outreach
        </h3>
        <p className="mt-1 text-[11px] text-text-secondary dark:text-zinc-500">
          Select a card to choose which hosted preview you send (after generation). SMS, email, and Instagram copy are
          saved per
          card type and update when you switch cards. Use{" "}
          <span className="font-mono">{"{{previewUrl}}"}</span> and{" "}
          <span className="font-mono">{"{{businessName}}"}</span> for Website, Web app, and Mobile; email defaults
          also use <span className="font-mono">{"{{yourName}}"}</span> (from your CRM context when provided). AI
          audit templates focus on the PDF follow-up.
        </p>
        {stitchContext ? (
          <p className="mt-3 rounded-lg border border-border/60 bg-white/40 px-2.5 py-2 text-[11px] text-text-secondary dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
            {stitchBrandingSummary(stitchContext)}
          </p>
        ) : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Website */}
          <div
            className={`cursor-pointer rounded-lg border border-border/70 bg-white/50 p-3 text-left transition-shadow dark:border-zinc-700/80 dark:bg-zinc-900/50 ${cardRing("website")}`}
            onClick={() => setSelectedOffer("website")}
          >
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-text-secondary/80 dark:text-zinc-500">
                Website design
              </h4>
              <Monitor className="h-4 w-4 shrink-0 text-text-secondary opacity-70 dark:text-zinc-500" aria-hidden />
            </div>
            <p className="mt-2 text-[11px] leading-snug text-text-secondary dark:text-zinc-400">
              Marketing / brochure-style multi-page website concept (desktop). {placeVsUrlIntro}
            </p>
            <p className="mt-2 text-[10px] text-text-secondary/90 dark:text-zinc-500">
              Generation can take a few minutes — do not double-click.
            </p>
            <div className="mt-2 flex flex-col gap-2">
              <button
                type="button"
                disabled={!stitchContext || stitchWebBusy}
                onClick={(e) => {
                  e.stopPropagation();
                  void runStitchDesign("website");
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-800 disabled:opacity-50 dark:border-blue-400/35 dark:bg-blue-500/15 dark:text-blue-200"
              >
                {stitchWebBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                {stitchWebBusy ? "Generating…" : "Generate website"}
              </button>
              {stitchContext && stitchApiConfigured === false ? (
                <button
                  type="button"
                  disabled={stitchManualTarget !== null}
                  onClick={(e) => {
                    e.stopPropagation();
                    void copyStitchPromptManual("website");
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-blue-500/50 px-3 py-2 text-xs font-semibold text-blue-900 dark:text-blue-200"
                >
                  {stitchManualTarget === "website" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Copy prompt
                </button>
              ) : null}
            </div>
            {stitchWebError ? (
              <p className="mt-2 text-[11px] text-red-600 dark:text-red-400">{stitchWebError}</p>
            ) : null}
            {stitchWebResult ? (
              <div onClick={(e) => e.stopPropagation()} className="mt-2">
                <StitchPreviewLinks
                  result={stitchWebResult}
                  label="Stitch · website"
                  target="website"
                  copyAndFlash={copyAndFlash}
                />
              </div>
            ) : null}
          </div>

          {/* Web app */}
          <div
            className={`cursor-pointer rounded-lg border border-border/70 bg-white/50 p-3 text-left dark:border-zinc-700/80 dark:bg-zinc-900/50 ${cardRing("webapp")}`}
            onClick={() => setSelectedOffer("webapp")}
          >
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-text-secondary/80 dark:text-zinc-500">
                Web apps
              </h4>
              <LayoutDashboard className="h-4 w-4 shrink-0 text-text-secondary opacity-70 dark:text-zinc-500" aria-hidden />
            </div>
            <p className="mt-2 text-[11px] leading-snug text-text-secondary dark:text-zinc-400">
              Desktop <span className="font-medium text-text-primary dark:text-zinc-200">web application</span> UI —
              dashboard, sidebar, tables (operator tool, not a marketing site). {placeVsUrlIntro}
            </p>
            <p className="mt-2 text-[10px] text-text-secondary/90 dark:text-zinc-500">
              Generation can take a few minutes — do not double-click.
            </p>
            <div className="mt-2 flex flex-col gap-2">
              <button
                type="button"
                disabled={!stitchContext || stitchWebAppBusy}
                onClick={(e) => {
                  e.stopPropagation();
                  void runStitchDesign("webapp");
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-800 disabled:opacity-50 dark:border-blue-400/35 dark:bg-blue-500/15 dark:text-blue-200"
              >
                {stitchWebAppBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                {stitchWebAppBusy ? "Generating…" : "Generate web app"}
              </button>
              {stitchContext && stitchApiConfigured === false ? (
                <button
                  type="button"
                  disabled={stitchManualTarget !== null}
                  onClick={(e) => {
                    e.stopPropagation();
                    void copyStitchPromptManual("webapp");
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-blue-500/50 px-3 py-2 text-xs font-semibold text-blue-900 dark:text-blue-200"
                >
                  {stitchManualTarget === "webapp" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Copy prompt
                </button>
              ) : null}
            </div>
            {stitchWebAppError ? (
              <p className="mt-2 text-[11px] text-red-600 dark:text-red-400">{stitchWebAppError}</p>
            ) : null}
            {stitchWebAppResult ? (
              <div onClick={(e) => e.stopPropagation()} className="mt-2">
                <StitchPreviewLinks
                  result={stitchWebAppResult}
                  label="Stitch · web app"
                  target="webapp"
                  copyAndFlash={copyAndFlash}
                />
              </div>
            ) : null}
          </div>

          {/* Mobile */}
          <div
            className={`cursor-pointer rounded-lg border border-border/70 bg-white/50 p-3 text-left dark:border-zinc-700/80 dark:bg-zinc-900/50 ${cardRing("mobile")}`}
            onClick={() => setSelectedOffer("mobile")}
          >
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-text-secondary/80 dark:text-zinc-500">
                Mobile app design
              </h4>
              <Smartphone className="h-4 w-4 shrink-0 text-text-secondary opacity-70 dark:text-zinc-500" aria-hidden />
            </div>
            <p className="mt-2 text-[11px] leading-snug text-text-secondary dark:text-zinc-400">
              Phone-sized operator app UI. Gemini 3.1 Pro for mobile generation. {placeVsUrlIntro}
            </p>
            <p className="mt-2 text-[10px] text-text-secondary/90 dark:text-zinc-500">
              Generation can take a few minutes — do not double-click.
            </p>
            <div className="mt-2 flex flex-col gap-2">
              <button
                type="button"
                disabled={!stitchContext || stitchMobileBusy}
                onClick={(e) => {
                  e.stopPropagation();
                  void runStitchDesign("mobile");
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-800 disabled:opacity-50 dark:border-blue-400/35 dark:bg-blue-500/15 dark:text-blue-200"
              >
                {stitchMobileBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                {stitchMobileBusy ? "Generating…" : "Generate mobile UI"}
              </button>
              {stitchContext && stitchApiConfigured === false ? (
                <button
                  type="button"
                  disabled={stitchManualTarget !== null}
                  onClick={(e) => {
                    e.stopPropagation();
                    void copyStitchPromptManual("mobile");
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-blue-500/50 px-3 py-2 text-xs font-semibold text-blue-900 dark:text-blue-200"
                >
                  {stitchManualTarget === "mobile" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Copy prompt
                </button>
              ) : null}
            </div>
            {stitchMobileError ? (
              <p className="mt-2 text-[11px] text-red-600 dark:text-red-400">{stitchMobileError}</p>
            ) : null}
            {stitchMobileResult ? (
              <div onClick={(e) => e.stopPropagation()} className="mt-2">
                <StitchPreviewLinks
                  result={stitchMobileResult}
                  label="Stitch · mobile"
                  target="mobile"
                  copyAndFlash={copyAndFlash}
                />
              </div>
            ) : null}
          </div>

          {/* AI audit (PDF) */}
          <div
            className={`cursor-pointer rounded-lg border border-border/70 bg-white/50 p-3 text-left dark:border-zinc-700/80 dark:bg-zinc-900/50 ${cardRing("automations")}`}
            onClick={() => setSelectedOffer("automations")}
          >
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-text-secondary/80 dark:text-zinc-500">
                AI audit
              </h4>
              <Workflow className="h-4 w-4 shrink-0 text-text-secondary opacity-70 dark:text-zinc-500" aria-hidden />
            </div>
            <p className="mt-2 text-[11px] leading-snug text-text-secondary dark:text-zinc-400">
              Structured assessment: map repeatable processes, identify the biggest time or money costs, recommend AI
              tools and workflows, and deliver a prioritized action plan. This PDF is not a build — implementation and
              rollout are quoted separately. When Anthropic or OpenAI is configured (same as prospect preview), the
              narrative is AI-written from your Highlights intel; otherwise the PDF stays research-only. Not a Stitch
              screen.
            </p>
            <button
              type="button"
              disabled={!marketIntelReport || pdfBusy}
              onClick={(e) => {
                e.stopPropagation();
                void generatePdf();
              }}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-500/[0.14] disabled:opacity-50 dark:border-blue-400/35 dark:bg-blue-500/15 dark:text-blue-200 dark:hover:bg-blue-500/20"
            >
              {pdfBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <FileDown className="h-3.5 w-3.5" aria-hidden />}
              {pdfBusy ? "Building PDF…" : "Generate report (PDF)"}
            </button>
            {pdfMsg ? (
              <p className="mt-2 text-[11px] text-text-secondary dark:text-zinc-400" role="status">
                {pdfMsg}
                {pdfFilename ? <span className="ml-1 font-mono text-[10px]">{pdfFilename}</span> : null}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 border-t border-border/60 pt-4 dark:border-zinc-700/60">
          <p className="text-[11px] font-medium text-text-secondary dark:text-zinc-400">
            Share outreach
            {selectedOffer !== "automations" ? (
              <>
                {" "}
                · templates for{" "}
                <span className="text-text-primary dark:text-zinc-200">
                  {selectedOffer === "website"
                    ? "Website design"
                    : selectedOffer === "webapp"
                      ? "Web apps"
                      : "Mobile app design"}
                </span>
              </>
            ) : (
              <>
                {" "}
                · templates for <span className="text-text-primary dark:text-zinc-200">AI audit</span> (hosted link send
                requires Website, Web app, or Mobile)
              </>
            )}
          </p>

          <div className="mt-4 grid gap-6 lg:grid-cols-3 lg:items-stretch">
            <section
              className="flex min-h-0 flex-col rounded-xl border border-border/70 bg-white/45 p-4 dark:border-zinc-700/70 dark:bg-zinc-900/35"
              aria-labelledby="prospect-share-sms-heading"
            >
              <div className="flex items-center gap-2 border-b border-border/50 pb-2 dark:border-zinc-700/50">
                <MessageSquare className="h-4 w-4 text-emerald-700/80 dark:text-emerald-400/90" aria-hidden />
                <h4
                  id="prospect-share-sms-heading"
                  className="text-xs font-semibold uppercase tracking-widest text-text-secondary/85 dark:text-zinc-400"
                >
                  SMS
                </h4>
              </div>
              <p className="mt-2 text-[10px] leading-snug text-text-secondary dark:text-zinc-500">
                Merge tags: <span className="font-mono">{"{{previewUrl}}"}</span>,{" "}
                <span className="font-mono">{"{{businessName}}"}</span>
                {selectedOffer === "automations" ? (
                  <> — <span className="font-mono">{"{{previewUrl}}"}</span> usually omitted (PDF follow-up).</>
                ) : (
                  <> — optional <span className="font-mono">{"{{yourName}}"}</span> (typical in email sign-off).</>
                )}
              </p>
              <label className="mb-1 mt-3 block text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                To
              </label>
              <input
                type="tel"
                value={smsTo}
                onChange={(e) => setSmsTo(e.target.value)}
                placeholder="+1…"
                className="w-full rounded-lg border border-border px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
              />
              <label className="mb-1 mt-3 block text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                Message
              </label>
              <textarea
                value={activeShareTpl.smsBody}
                onChange={(e) => updateActiveShareTemplates({ smsBody: e.target.value })}
                rows={5}
                className="min-h-[7.5rem] w-full flex-1 rounded-lg border border-border px-2 py-1.5 font-mono text-[11px] dark:border-zinc-700 dark:bg-zinc-900"
              />
              <label className="mt-3 flex cursor-pointer items-start gap-2 text-[11px] text-text-secondary dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={attachPreviewImage}
                  onChange={(e) => setAttachPreviewImage(e.target.checked)}
                  className="mt-0.5 rounded border-border"
                />
                <span>
                  Attach preview image for MMS: uses the hosted page screenshot when ready, otherwise the Stitch
                  preview image. Email inlines the same priority when the server can fetch the image.
                </span>
              </label>
              <div className="mt-4">
                <button
                  type="button"
                  disabled={!canSharePreview || shareBusy !== null || !smsTo.trim()}
                  onClick={() => void sendSms()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-900 disabled:opacity-50 dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-100 sm:w-auto"
                >
                  {shareBusy === "sms" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Send SMS
                </button>
              </div>
            </section>

            <section
              className="flex min-h-0 flex-col rounded-xl border border-border/70 bg-white/45 p-4 dark:border-zinc-700/70 dark:bg-zinc-900/35"
              aria-labelledby="prospect-share-email-heading"
            >
              <div className="flex items-center gap-2 border-b border-border/50 pb-2 dark:border-zinc-700/50">
                <Mail className="h-4 w-4 text-sky-700/80 dark:text-sky-400/90" aria-hidden />
                <h4
                  id="prospect-share-email-heading"
                  className="text-xs font-semibold uppercase tracking-widest text-text-secondary/85 dark:text-zinc-400"
                >
                  Email
                </h4>
              </div>
              <p className="mt-2 text-[10px] leading-snug text-text-secondary dark:text-zinc-500">
                Same merge tags as SMS, plus <span className="font-mono">{"{{yourName}}"}</span> in the default
                sign-off when your profile supplies it. Subject and body can differ per service type. A preview
                image is embedded when available (hosted screenshot first, else Stitch CDN URL).
              </p>
              <label className="mb-1 mt-3 block text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                To
              </label>
              <input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                className="w-full rounded-lg border border-border px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
              />
              <label className="mb-1 mt-3 block text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                Subject
              </label>
              <input
                value={activeShareTpl.emailSubject}
                onChange={(e) => updateActiveShareTemplates({ emailSubject: e.target.value })}
                className="w-full rounded-lg border border-border px-2 py-1.5 font-mono text-[11px] dark:border-zinc-700 dark:bg-zinc-900"
              />
              <label className="mb-1 mt-3 block text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                Body
              </label>
              <textarea
                value={activeShareTpl.emailBody}
                onChange={(e) => updateActiveShareTemplates({ emailBody: e.target.value })}
                rows={6}
                className="min-h-[9rem] w-full flex-1 rounded-lg border border-border px-2 py-1.5 font-mono text-[11px] dark:border-zinc-700 dark:bg-zinc-900"
              />
              <div className="mt-4">
                <button
                  type="button"
                  disabled={!canSharePreview || shareBusy !== null || !emailTo.trim()}
                  onClick={() => void sendEmail()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2.5 text-xs font-semibold text-sky-900 disabled:opacity-50 dark:border-sky-400/35 dark:bg-sky-500/15 dark:text-sky-100 sm:w-auto"
                >
                  {shareBusy === "email" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Mail className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Send email
                </button>
              </div>
            </section>

            <section
              className="flex min-h-0 flex-col rounded-xl border border-border/70 bg-white/45 p-4 dark:border-zinc-700/70 dark:bg-zinc-900/35"
              aria-labelledby="prospect-share-instagram-heading"
            >
              <div className="flex items-center gap-2 border-b border-border/50 pb-2 dark:border-zinc-700/50">
                <Instagram className="h-4 w-4 text-pink-700/85 dark:text-pink-400/90" aria-hidden />
                <h4
                  id="prospect-share-instagram-heading"
                  className="text-xs font-semibold uppercase tracking-widest text-text-secondary/85 dark:text-zinc-400"
                >
                  Instagram
                </h4>
              </div>
              <p className="mt-2 text-[10px] leading-snug text-text-secondary dark:text-zinc-500">
                Same merge tags as SMS. There is no supported way for this app to send Instagram DMs directly;
                copy the message, then open their profile and paste in a DM (or use Meta&apos;s Business API with
                your own app if you need automation).
              </p>
              <label className="mb-1 mt-3 block text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                Profile URL or @handle
              </label>
              <input
                type="text"
                value={instagramTo}
                onChange={(e) => setInstagramTo(e.target.value)}
                placeholder="https://www.instagram.com/theirbrand/ or @theirbrand"
                className="w-full rounded-lg border border-border px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
              />
              <label className="mb-1 mt-3 block text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                Message
              </label>
              <textarea
                value={activeShareTpl.instagramBody}
                onChange={(e) => updateActiveShareTemplates({ instagramBody: e.target.value })}
                rows={5}
                className="min-h-[7.5rem] w-full flex-1 rounded-lg border border-border px-2 py-1.5 font-mono text-[11px] dark:border-zinc-700 dark:bg-zinc-900"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!canCopyInstagramMessage || shareBusy !== null}
                  onClick={() => void copyInstagramMessage()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-pink-500/40 bg-pink-500/10 px-4 py-2.5 text-xs font-semibold text-pink-950 disabled:opacity-50 dark:border-pink-400/35 dark:bg-pink-500/15 dark:text-pink-100 sm:w-auto"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                  Copy message
                </button>
                <button
                  type="button"
                  disabled={shareBusy !== null || !normalizeInstagramProfileUrl(instagramTo)}
                  onClick={() => openInstagramProfile()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-xs font-semibold text-text-primary disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-100 sm:w-auto"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  Open profile
                </button>
              </div>
            </section>
          </div>

          {shareMsg ? (
            <p className="mt-4 text-[11px] text-text-secondary dark:text-zinc-400" role="status">
              {shareMsg}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
