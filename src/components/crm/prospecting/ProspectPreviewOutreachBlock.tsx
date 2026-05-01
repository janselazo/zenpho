"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Copy,
  ExternalLink,
  Facebook,
  FileDown,
  ImageDown,
  Instagram,
  LayoutDashboard,
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Monitor,
  Paperclip,
  Palette,
  Plus,
  Smartphone,
  Video,
  Workflow,
  X,
  ShieldAlert,
} from "lucide-react";
import {
  composeBeforeAfterImage,
} from "@/lib/crm/prospect-before-after-image";
import { renderAuditShareImage } from "@/lib/revenue-leak-audit/audit-share-image";
import type { RevenueLeakAudit } from "@/lib/revenue-leak-audit/types";
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
  type OutreachFileAttachment,
} from "@/app/(crm)/actions/prospect-preview";
import { generateProspectAutomationPdfAction } from "@/app/(crm)/actions/prospect-automation-report";
import { mergeProspectOutreachTemplate } from "@/lib/crm/prospect-outreach-template";
import { messengerHandoffUrlFromFacebook } from "@/lib/crm/social-handoff-urls";
import {
  downloadBlob,
  PROSPECT_PREVIEW_VIDEO_DURATION_SEC,
  PROSPECT_PREVIEW_VIDEO_EMAIL_HINT,
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
type SelectedOffer = StitchTarget | "automations" | "branding" | "audit";

type OutreachAttachment = {
  id: string;
  name: string;
  blob: Blob;
  source: "suggested" | "custom";
};

type SerializedOutreachAttachment = OutreachFileAttachment;

type BrandingPdfResult =
  | {
      ok: true;
      pdfUrl: string;
      pdfPath: string;
      filename: string;
      imageWarnings?: string[];
    }
  | { ok: false; error: string };

type BrandingShareImageResult =
  | {
      ok: true;
      svg: string;
      width: number;
      height: number;
      filename: string;
    }
  | { ok: false; error: string };

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/png", "image/jpeg", "image/gif", "image/webp",
  "video/mp4", "video/webm",
  "application/pdf",
]);

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function serializeBlobAttachment(
  name: string,
  blob: Blob,
): Promise<SerializedOutreachAttachment> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return {
    name,
    base64: btoa(binary),
    contentType: blob.type || "application/octet-stream",
  };
}

const STITCH_HELP_URL = stitchWithGoogleAppHomeUrl();

function buildClientPreviewLink(previewId: string, slug: string | null | undefined): string {
  if (typeof window === "undefined") return "";
  const origin = window.location.origin;
  const s = slug?.trim();
  if (s) return `${origin}/preview/${encodeURIComponent(s)}`;
  return `${origin}/preview/${encodeURIComponent(previewId)}`;
}

/**
 * Click-to-chat WhatsApp deep link from a phone number / wa.me URL.
 * Accepts: `+1 (555) 123-4567`, `15551234567`, `wa.me/15551234567`, `https://wa.me/15551234567`.
 * Returns digits-only suitable for `https://wa.me/<digits>` (8–15 digits, country code expected).
 */
function normalizeWhatsappDigits(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/wa\.me/i.test(t) || /whatsapp\.com/i.test(t)) {
    try {
      const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
      const digits =
        u.pathname.replace(/\D/g, "") ||
        (u.searchParams.get("phone") ?? "").replace(/\D/g, "");
      if (digits.length >= 8 && digits.length <= 15) return digits;
    } catch {
      /* fall through */
    }
  }
  const digits = t.replace(/\D/g, "");
  if (digits.length >= 8 && digits.length <= 15) return digits;
  return null;
}

function buildWhatsappDeepLink(rawTo: string, message: string): string | null {
  const digits = normalizeWhatsappDigits(rawTo);
  if (!digits) return null;
  const text = message.trim() ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

/**
 * Handoff URL for Facebook contact: prefers `m.me/<page>` so the recipient lands in Messenger.
 * Falls back to opening the original facebook.com URL when we can't resolve a page handle.
 */
function normalizeFacebookHandoffUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  return messengerHandoffUrlFromFacebook(t);
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
  /** Click-to-chat copy for WhatsApp deep-link (`https://wa.me/<digits>?text=…`). */
  whatsappBody: string;
  /** DM-style copy for Facebook Messenger handoff (`https://m.me/<page>`). */
  facebookBody: string;
};

function defaultShareTemplatesForOffer(offer: SelectedOffer): ShareTemplates {
  switch (offer) {
    case "website":
      return {
        smsBody:
          "Hi {{businessName}}, we put together a website upgrade that could help you attract more customers online. Check it out:\n\n{{previewUrl}}\n\nHappy to walk you through it. Hablamos español!",
        emailSubject: "A website concept we created for {{businessName}}",
        emailBody:
          "Hi {{businessName}},\n\nWe created a custom website concept for your business. Modern design, built to convert visitors into customers:\n\n{{previewUrl}}\n\nThis is yours to keep either way. If you'd like to take it live or make changes, we're here to help.\n\nHablamos español también.\n\nBest,\n{{yourName}}",
        instagramBody:
          "Hi {{businessName}}! We designed a website concept for your business, check it out:\n\n{{previewUrl}}\n\nLet us know what you think! Hablamos español\n\n{{yourName}}",
        whatsappBody:
          "Hi {{businessName}}! We put together a website concept for your business, take a look:\n\n{{previewUrl}}\n\nHappy to walk you through it. Hablamos español!\n\n— {{yourName}}",
        facebookBody:
          "Hi {{businessName}}! We designed a website concept for your business, check it out:\n\n{{previewUrl}}\n\nLet us know what you think! Hablamos español\n\n— {{yourName}}",
      };
    case "webapp":
      return {
        smsBody:
          "Hi {{businessName}}, imagine managing your business from one dashboard. We designed a web app concept just for you:\n\n{{previewUrl}}\n\nReply and we'll walk you through it. Se habla español.",
        emailSubject: "A web app concept we designed for {{businessName}}",
        emailBody:
          "Hi {{businessName}},\n\nWe designed a web app concept that could help you run your business from a single dashboard. Appointments, clients, reports, all in one place:\n\n{{previewUrl}}\n\nIf this looks like something you'd use, we can hop on a quick call to talk about making it real.\n\nHablamos español también.\n\nBest,\n{{yourName}}",
        instagramBody:
          "Hi {{businessName}}! We designed a web app concept for your business, check it out:\n\n{{previewUrl}}\n\nLet us know what you think! Hablamos español\n\n{{yourName}}",
        whatsappBody:
          "Hi {{businessName}}! We designed a web app concept to run your business from one dashboard:\n\n{{previewUrl}}\n\nHappy to walk you through it. Hablamos español!\n\n— {{yourName}}",
        facebookBody:
          "Hi {{businessName}}! We designed a web app concept for your business, check it out:\n\n{{previewUrl}}\n\nLet us know what you think! Hablamos español\n\n— {{yourName}}",
      };
    case "mobile":
      return {
        smsBody:
          "Hi {{businessName}}, we designed a mobile app concept so your customers can book, browse, and connect with you right from their phone:\n\n{{previewUrl}}\n\nWant a quick walkthrough? Hablamos español!",
        emailSubject: "A mobile app concept we designed for {{businessName}}",
        emailBody:
          "Hi {{businessName}},\n\nWe put together a mobile app preview for your business. Your customers would be able to reach you, book services, and stay connected all from their phone:\n\n{{previewUrl}}\n\nThis is yours to keep. If you want to take it further, let's set up a quick call.\n\nWe also speak Spanish if that's easier.\n\nBest,\n{{yourName}}",
        instagramBody:
          "Hi {{businessName}}! We designed a mobile app concept for your business, check it out:\n\n{{previewUrl}}\n\nLet us know what you think! Hablamos español\n\n{{yourName}}",
        whatsappBody:
          "Hi {{businessName}}! We designed a mobile app concept so your customers can book and connect from their phone:\n\n{{previewUrl}}\n\nWant a quick walkthrough? Hablamos español!\n\n— {{yourName}}",
        facebookBody:
          "Hi {{businessName}}! We designed a mobile app concept for your business, check it out:\n\n{{previewUrl}}\n\nLet us know what you think! Hablamos español\n\n— {{yourName}}",
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
        whatsappBody:
          "Hi! AI audit draft for {{businessName}} — processes, cost hotspots, recommended tools/workflows, and a prioritized plan (implementation is a separate step). Want the PDF or a quick call?\n\n— {{yourName}}",
        facebookBody:
          "Hi! AI audit draft for {{businessName}} — processes, cost hotspots, recommended tools/workflows, and a prioritized plan (implementation is a separate step). Want the PDF or a quick call?\n\n— {{yourName}}",
      };
    case "audit":
      return {
        smsBody:
          "Hi {{businessName}} — I put together a quick Revenue Leak Audit summary image (score, $ at risk, top findings). If useful, I can send the full PDF with every issue and suggested fixes. Want the PDF?",
        emailSubject: "Revenue Leak Audit snapshot for {{businessName}}",
        emailBody:
          "Hi {{businessName}},\n\nI ran a Revenue Leak Audit on your Google Business Profile and website. Attached is a one-page summary (score, estimated monthly $ at risk, and top findings).\n\nIf you’d like the full report, I can send the PDF next — it walks through local ranking vs competitors, reviews, website conversion, tracking/ads readiness, photos/schema/local SEO, and a prioritized action plan with suggested fixes.\n\nHablamos español también.\n\nBest,\n{{yourName}}",
        instagramBody:
          "Hi {{businessName}}! Quick Revenue Leak Audit summary image attached (score + top findings). Want the full PDF with all issues & fixes?\n\n— {{yourName}}",
        whatsappBody:
          "Hi {{businessName}}! Sending a one-page Revenue Leak Audit summary — score, $ at risk, top findings. Want the full PDF with all issues & suggested fixes?\n\n— {{yourName}}",
        facebookBody:
          "Hi {{businessName}}! Quick Revenue Leak Audit summary — score, money at risk, top findings. I can send the full PDF with every issue & suggested fixes if you want it.\n\n— {{yourName}}",
      };
    case "branding":
      return {
        smsBody:
          "Hi {{businessName}} — I put together a quick brand + ads preview image for you: palette, typography, website direction, and campaign assets. I can send the detailed PDF next if you want.",
        emailSubject: "Brand kit + paid-ads funnel for {{businessName}}",
        emailBody:
          "Hi {{businessName}},\n\nI put together a quick brand + ads preview image for you first: palette, typography, website direction, and campaign assets for Meta, Instagram, and Google.\n\nIf it feels useful, I can send the detailed Brand Kit + Sales Funnel PDF next with the full brand book, landing page strategy, ad copy, suggested budget, and KPIs.\n\nHablamos español también.\n\nBest,\n{{yourName}}",
        instagramBody:
          "Hi {{businessName}}! I made a quick brand + ads preview image for you — palette, website direction, and FB/IG/Google campaign assets. I can send the detailed PDF next if you want.\n\n— {{yourName}}",
        whatsappBody:
          "Hi {{businessName}}! I made a quick brand + ads preview image for you — palette, website direction, and FB/IG/Google campaign assets. I can send the detailed PDF next if you want.\n\n— {{yourName}}",
        facebookBody:
          "Hi {{businessName}}! I made a quick brand + ads preview image for you — palette, website direction, and FB/IG/Google campaign assets. I can send the detailed PDF next if you want.\n\n— {{yourName}}",
      };
  }
}

function createInitialShareTemplates(): Record<SelectedOffer, ShareTemplates> {
  return {
    website: defaultShareTemplatesForOffer("website"),
    webapp: defaultShareTemplatesForOffer("webapp"),
    mobile: defaultShareTemplatesForOffer("mobile"),
    automations: defaultShareTemplatesForOffer("automations"),
    branding: defaultShareTemplatesForOffer("branding"),
    audit: defaultShareTemplatesForOffer("audit"),
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

async function convertSvgToPngBlob(
  svg: string,
  width: number,
  height: number,
): Promise<Blob> {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const node = new Image();
      node.onload = () => resolve(node);
      node.onerror = () => reject(new Error("Could not render share image SVG."));
      node.src = svgUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    ctx.drawImage(img, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not create PNG share image."));
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function StitchPreviewLinks({
  result,
  label,
  target,
  copyAndFlash,
  onVideoReady,
}: {
  result: StitchOk;
  label: string;
  target: StitchTarget;
  copyAndFlash: (t: string) => void;
  onVideoReady?: (blob: Blob) => void;
}) {
  const [imageDownloadBusy, setImageDownloadBusy] = useState(false);
  const [videoPreparing, setVideoPreparing] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [pregenRetryKey, setPregenRetryKey] = useState(0);
  const [sessionVideoUrl, setSessionVideoUrl] = useState<string | null>(null);
  const sessionVideoUrlRef = useRef<string | null>(null);
  const videoBlobRef = useRef<Blob | null>(null);

  useEffect(() => {
    return () => {
      if (sessionVideoUrlRef.current) {
        URL.revokeObjectURL(sessionVideoUrlRef.current);
        sessionVideoUrlRef.current = null;
      }
      videoBlobRef.current = null;
    };
  }, []);

  const hostedId = result.hostedPreviewId?.trim();
  const canScrollVideo = Boolean(hostedId);

  useEffect(() => {
    if (!hostedId) return;

    let cancelled = false;
    setVideoPreparing(true);
    setVideoError(null);
    if (sessionVideoUrlRef.current) {
      URL.revokeObjectURL(sessionVideoUrlRef.current);
      sessionVideoUrlRef.current = null;
    }
    videoBlobRef.current = null;
    setSessionVideoUrl(null);

    void (async () => {
      try {
        type PreviewHtmlResp = { ok?: boolean; html?: string; deviceType?: PreviewDeviceTypeForVideo; error?: string };
        let lastErr: unknown;
        let data: PreviewHtmlResp | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (cancelled) return;
          if (attempt > 0) await new Promise((r) => setTimeout(r, 2000 * attempt));
          try {
            const res = await fetch(
              `/api/prospecting/preview-html?previewId=${encodeURIComponent(hostedId)}`,
              { credentials: "same-origin" },
            );
            const parsed = (await res.json()) as PreviewHtmlResp;
            if (res.ok && parsed?.ok && parsed.html?.trim()) { data = parsed; break; }
            lastErr = new Error(parsed?.error || "Could not load preview HTML.");
          } catch (fetchErr) {
            lastErr = fetchErr;
          }
        }
        if (!data?.html?.trim()) {
          throw lastErr ?? new Error("Could not load preview HTML after retries.");
        }
        const blob = await recordProspectPreviewScrollVideo({
          html: data.html,
          deviceType: data.deviceType ?? null,
        });
        if (cancelled) return;
        videoBlobRef.current = blob;
        onVideoReady?.(blob);
        const vUrl = URL.createObjectURL(blob);
        sessionVideoUrlRef.current = vUrl;
        setSessionVideoUrl(vUrl);
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Could not record scroll video.";
          setVideoError(msg);
        }
      } finally {
        if (!cancelled) setVideoPreparing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hostedId, result.screenId, pregenRetryKey]);

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
          className="max-h-64 w-full rounded-md border border-border object-contain dark:border-zinc-700"
          src={sessionVideoUrl}
          controls
          playsInline
          muted
          autoPlay
          loop
        />
      ) : videoPreparing ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-blue-500/30 bg-blue-500/[0.04] px-3 py-2.5 dark:border-blue-400/20 dark:bg-blue-500/[0.06]">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600 dark:text-blue-400" aria-hidden />
          <span className="text-[11px] font-medium text-blue-800 dark:text-blue-200">
            Recording {PROSPECT_PREVIEW_VIDEO_DURATION_SEC}s homepage walkthrough&hellip;
          </span>
        </div>
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
          title="Opens Stitch HTML export in a new browser tab"
          className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary hover:underline dark:text-zinc-400 dark:hover:text-zinc-300"
        >
          View HTML
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
        {sessionVideoUrl ? (
          <button
            type="button"
            onClick={() => {
              const blob = videoBlobRef.current;
              if (!blob) return;
              const safeId = result.screenId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "preview";
              downloadBlob(blob, `stitch-preview-${target}-${safeId}-walkthrough.mp4`);
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary dark:text-zinc-400"
          >
            <Video className="h-3 w-3" aria-hidden />
            Download video
          </button>
        ) : null}
        {videoError ? (
          <button
            type="button"
            onClick={() => {
              setVideoError(null);
              setPregenRetryKey((k) => k + 1);
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 hover:underline dark:text-amber-200/90"
          >
            Retry video
          </button>
        ) : null}
      </div>
      {!canScrollVideo ? (
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
          Homepage walkthrough video needs a hosted preview (saved when Stitch generation succeeds).
        </p>
      ) : null}
      {videoError ? (
        <p className="text-[11px] text-red-600 dark:text-red-400">{videoError}</p>
      ) : null}
    </div>
  );
}

function BeforeAfterComparison({
  existingWebsiteUrl,
  stitchResult,
  businessName,
}: {
  existingWebsiteUrl: string;
  stitchResult: StitchOk;
  businessName: string;
}) {
  const [beforeLoaded, setBeforeLoaded] = useState(false);
  const [afterLoaded, setAfterLoaded] = useState(false);
  const [beforeFailed, setBeforeFailed] = useState(false);
  const [afterFailed, setAfterFailed] = useState(false);
  const [composing, setComposing] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);

  const beforeSrc = `/api/prospecting/website-snapshot?url=${encodeURIComponent(existingWebsiteUrl)}`;
  const afterSrc = stitchResult.imageUrl;
  const bothReady = (beforeLoaded || beforeFailed) && (afterLoaded || afterFailed);

  const beforeImgRef = useRef<HTMLImageElement | null>(null);
  const afterImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setBeforeLoaded(false);
    setBeforeFailed(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { beforeImgRef.current = img; setBeforeLoaded(true); };
    img.onerror = () => setBeforeFailed(true);
    img.src = beforeSrc;
    return () => { img.onload = null; img.onerror = null; };
  }, [beforeSrc]);

  useEffect(() => {
    setAfterLoaded(false);
    setAfterFailed(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { afterImgRef.current = img; setAfterLoaded(true); };
    img.onerror = () => setAfterFailed(true);
    img.src = afterSrc;
    return () => { img.onload = null; img.onerror = null; };
  }, [afterSrc]);

  const downloadComparison = useCallback(async () => {
    setComposing(true);
    setComposeError(null);
    try {
      const blob = await composeBeforeAfterImage({
        beforeImageUrl: beforeSrc,
        afterImageUrl: afterSrc,
        businessName,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `before-after-${businessName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40)}.png`;
      a.rel = "noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setComposeError(e instanceof Error ? e.message : "Could not compose comparison image.");
    } finally {
      setComposing(false);
    }
  }, [beforeSrc, afterSrc, businessName]);

  const imgSkeleton = (
    <div className="flex h-36 items-center justify-center rounded-md border border-border bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
      <Loader2 className="h-5 w-5 animate-spin text-zinc-400 dark:text-zinc-500" aria-hidden />
    </div>
  );

  return (
    <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.04] p-3 dark:border-amber-400/20 dark:bg-amber-500/[0.06]">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900/80 dark:text-amber-200/90">
        Before vs After
      </p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-red-700/80 dark:text-red-300/80">
            Current website
          </p>
          {beforeFailed ? (
            <div className="flex h-28 items-center justify-center rounded-md border border-border bg-zinc-100 text-[10px] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              Screenshot unavailable
            </div>
          ) : !beforeLoaded ? (
            imgSkeleton
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element -- Microlink proxy screenshot */
            <img
              src={beforeSrc}
              alt="Current website"
              className="max-h-36 w-full rounded-md border border-border object-contain object-top dark:border-zinc-700"
            />
          )}
          <p className="mt-1 truncate text-center text-[9px] text-zinc-500 dark:text-zinc-400">
            {existingWebsiteUrl}
          </p>
        </div>
        <div>
          <p className="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-emerald-700/80 dark:text-emerald-300/80">
            Your new website
          </p>
          {afterFailed ? (
            <div className="flex h-28 items-center justify-center rounded-md border border-border bg-zinc-100 text-[10px] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              Preview image unavailable
            </div>
          ) : !afterLoaded ? (
            imgSkeleton
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element -- Stitch CDN screenshot */
            <img
              src={afterSrc}
              alt="New website design"
              className="max-h-36 w-full rounded-md border border-border object-contain object-top dark:border-zinc-700"
            />
          )}
          {stitchResult.hostedPreviewUrl ? (
            <p className="mt-1 text-center">
              <a
                href={stitchResult.hostedPreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[9px] font-medium text-blue-700 hover:underline dark:text-blue-300"
              >
                Open live preview
                <ArrowRight className="ml-0.5 inline h-2.5 w-2.5" aria-hidden />
              </a>
            </p>
          ) : null}
        </div>
      </div>
      {!bothReady ? (
        <p className="mt-2 text-center text-[10px] text-zinc-500 dark:text-zinc-400">
          <Loader2 className="mr-1 inline h-3 w-3 animate-spin" aria-hidden />
          Loading website screenshots for comparison&hellip;
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              disabled={composing || beforeFailed || afterFailed}
              onClick={() => void downloadComparison()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-900 disabled:opacity-50 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100"
            >
              {composing ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <ImageDown className="h-3 w-3" aria-hidden />
              )}
              {composing ? "Composing\u2026" : "Download comparison image"}
            </button>
            {composeError ? (
              <span className="text-[10px] text-red-600 dark:text-red-400">{composeError}</span>
            ) : null}
          </div>
          <p className="mt-1.5 text-[9px] leading-snug text-zinc-500 dark:text-zinc-400">
            Side-by-side PNG you can attach to SMS, email, or DM to show the prospect the upgrade.
          </p>
        </>
      )}
    </div>
  );
}

function minimalBusinessFromPlace(place: PlacesSearchPlace) {
  return {
    placeId: place.id,
    name: place.name,
    address: place.formattedAddress ?? null,
    phone:
      place.nationalPhoneNumber?.trim() ||
      place.internationalPhoneNumber?.trim() ||
      null,
    website: place.websiteUri?.trim() || null,
    category: null,
    types: place.types ?? [],
    rating: typeof place.rating === "number" ? place.rating : null,
    reviewCount:
      typeof place.userRatingCount === "number" ? Math.round(place.userRatingCount) : null,
    reviews: [],
    photos: [],
    photoCount: null,
    coordinates: null,
    hours: [],
    googleMapsUri: place.googleMapsUri ?? null,
    businessStatus: place.businessStatus ?? null,
    identityAttributes: [],
  };
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
  /**
   * WhatsApp click-to-chat target. Accepts a phone number, raw digits, or a
   * `https://wa.me/<digits>` URL. Falls back to `contactPhone` when empty.
   */
  contactWhatsapp?: string;
  /** Facebook page URL or `m.me/<handle>` for Messenger handoff. */
  contactFacebook?: string;
  yourName?: string;
  marketIntelReport?: MarketIntelReport | null;
  /** Latest hosted Stitch preview (for linking on create lead). */
  onHostedPreviewReady?: (info: {
    target: StitchTarget;
    previewId: string;
    slug: string | null;
  }) => void;
  /** Stored Brand Kit PDF for attaching after lead create. */
  onBrandingPdfReady?: (info: {
    pdfPath: string;
    pdfUrl: string;
    filename: string;
  }) => void;
  /** Persist generated PDF straight to this lead row (Lead detail flows). */
  linkedLeadId?: string | null;
};

export default function ProspectPreviewOutreachBlock({
  stitchContext = null,
  reportKey = "",
  businessName: businessNameProp = "",
  contactPhone = "",
  contactEmail = "",
  contactInstagram = "",
  contactWhatsapp = "",
  contactFacebook = "",
  yourName = "",
  marketIntelReport = null,
  onHostedPreviewReady,
  onBrandingPdfReady,
  linkedLeadId = null,
}: Props) {
  const copyMsgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (copyMsgTimerRef.current) clearTimeout(copyMsgTimerRef.current);
    };
  }, []);

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
  const [copyMsg, setCopyMsgRaw] = useState<string | null>(null);
  const flashCopyMsg = useCallback((msg: string | null, ms?: number) => {
    if (copyMsgTimerRef.current) clearTimeout(copyMsgTimerRef.current);
    setCopyMsgRaw(msg);
    if (msg && ms) {
      copyMsgTimerRef.current = setTimeout(() => setCopyMsgRaw(null), ms);
    }
  }, []);
  const [selectedOffer, setSelectedOffer] = useState<SelectedOffer>("website");

  const [smsTo, setSmsTo] = useState(contactPhone);
  const [emailTo, setEmailTo] = useState(contactEmail);
  const [instagramTo, setInstagramTo] = useState(contactInstagram);
  const [whatsappTo, setWhatsappTo] = useState(contactWhatsapp || contactPhone);
  const [facebookTo, setFacebookTo] = useState(contactFacebook);
  const [shareTemplates, setShareTemplates] = useState(createInitialShareTemplates);
  const [attachPreviewImage, setAttachPreviewImage] = useState(true);
  const [outreachAttachments, setOutreachAttachments] = useState<OutreachAttachment[]>([]);
  const parentVideoBlobRef = useRef<Blob | null>(null);
  const [hasVideoBlob, setHasVideoBlob] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [shareBusy, setShareBusy] = useState<null | "sms" | "email">(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const addOutreachAttachment = useCallback((att: OutreachAttachment) => {
    setOutreachAttachments((prev) => {
      return [...prev.filter((a) => a.id !== att.id), att];
    });
  }, []);

  const removeOutreachAttachment = useCallback((id: string) => {
    setOutreachAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleFilePick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) continue;
      if (file.size > MAX_ATTACHMENT_BYTES) continue;
      addOutreachAttachment({
        id: `file-${Date.now()}-${file.name}`,
        name: file.name,
        blob: file,
        source: "custom",
      });
    }
    e.target.value = "";
  }, [addOutreachAttachment]);

  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfMsg, setPdfMsg] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string | null>(null);

  const [auditBusy, setAuditBusy] = useState(false);
  const [auditMsg, setAuditMsg] = useState<string | null>(null);
  const [auditFilename, setAuditFilename] = useState<string | null>(null);
  const [auditBlob, setAuditBlob] = useState<Blob | null>(null);
  const [auditSnapshot, setAuditSnapshot] = useState<RevenueLeakAudit | null>(null);
  const [auditSnapshotPlaceId, setAuditSnapshotPlaceId] = useState<string | null>(null);
  const [auditShareBusy, setAuditShareBusy] = useState(false);
  const [auditShareMsg, setAuditShareMsg] = useState<string | null>(null);
  const [auditShareFilename, setAuditShareFilename] = useState<string | null>(null);
  const [auditShareBlob, setAuditShareBlob] = useState<Blob | null>(null);

  const [brandingBusy, setBrandingBusy] = useState(false);
  const [brandingMsg, setBrandingMsg] = useState<string | null>(null);
  const [brandingFilename, setBrandingFilename] = useState<string | null>(null);
  const [brandingPdfUrl, setBrandingPdfUrl] = useState<string | null>(null);
  const [brandingShareBusy, setBrandingShareBusy] = useState(false);
  const [brandingShareMsg, setBrandingShareMsg] = useState<string | null>(null);
  const [brandingShareFilename, setBrandingShareFilename] = useState<string | null>(null);
  const [brandingShareBlob, setBrandingShareBlob] = useState<Blob | null>(null);

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

  const existingWebsiteUrl = useMemo(() => {
    if (stitchContext?.kind === "place") return stitchContext.place.websiteUri?.trim() || null;
    if (stitchContext?.kind === "url") return stitchContext.url?.trim() || null;
    return null;
  }, [stitchContext]);

  const hasWalkthroughAttachment = outreachAttachments.some(
    (att) => att.id === "walkthrough-video",
  );
  const hasBeforeAfterAttachment = outreachAttachments.some(
    (att) => att.id === "before-after-image",
  );
  const hasBrandShareAttachment = outreachAttachments.some(
    (att) => att.id === "brand-share-image",
  );
  const hasAuditReportAttachment = outreachAttachments.some(
    (att) => att.id === "audit-report-pdf",
  );
  const hasAuditShareAttachment = outreachAttachments.some(
    (att) => att.id === "audit-share-image",
  );

  const stitchPlaceId = useMemo(
    () => (stitchContext?.kind === "place" ? stitchContext.place.id : null),
    [stitchContext],
  );

  useEffect(() => {
    setAuditSnapshot(null);
    setAuditSnapshotPlaceId(null);
    setAuditBlob(null);
    setAuditFilename(null);
    setAuditMsg(null);
    setAuditShareBlob(null);
    setAuditShareFilename(null);
    setAuditShareMsg(null);
    setOutreachAttachments((prev) =>
      prev.filter((a) => a.id !== "audit-report-pdf" && a.id !== "audit-share-image"),
    );
  }, [stitchPlaceId]);

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
    setWhatsappTo(contactWhatsapp || contactPhone);
  }, [contactWhatsapp, contactPhone]);

  useEffect(() => {
    setFacebookTo(contactFacebook);
  }, [contactFacebook]);

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
    setAuditBusy(false);
    setAuditMsg(null);
    setAuditFilename(null);
    setAuditBlob(null);
    setAuditSnapshot(null);
    setAuditSnapshotPlaceId(null);
    setAuditShareBusy(false);
    setAuditShareMsg(null);
    setAuditShareFilename(null);
    setAuditShareBlob(null);
    setBrandingMsg(null);
    setBrandingFilename(null);
    setBrandingPdfUrl(null);
    setOutreachAttachments((prev) =>
      prev.filter((a) => a.id !== "audit-report-pdf" && a.id !== "audit-share-image"),
    );
  }, [reportKey]);

  const copyAndFlash = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flashCopyMsg("Copied to clipboard.", 2500);
    } catch {
      flashCopyMsg("Could not copy (browser blocked).", 3500);
    }
  }, [flashCopyMsg]);

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
          flashCopyMsg("Could not build Stitch prompt.", 4000);
          return;
        }
        const o = data as Record<string, unknown>;
        if (o.ok !== true || typeof o.prompt !== "string") {
          const err = typeof o.error === "string" ? o.error : "Could not build Stitch prompt.";
          flashCopyMsg(err, 4000);
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
        flashCopyMsg("Prompt copied. Paste it into Google Stitch in the new tab.", 3500);
        window.open(STITCH_HELP_URL, "_blank", "noopener,noreferrer");
      } catch {
        flashCopyMsg("Could not copy prompt (browser blocked or network error).", 4000);
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

      const MAX_ATTEMPTS = 2;
      const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes per attempt

      try {
        let lastError = "";
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
          const ac = new AbortController();
          const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
          try {
            const res = await fetch("/api/prospecting/stitch-design", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "same-origin",
              signal: ac.signal,
              body: JSON.stringify(payload),
            });
            clearTimeout(timer);
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
            if (r.hostedPreviewId?.trim()) {
              onHostedPreviewReady?.({
                target,
                previewId: r.hostedPreviewId.trim(),
                slug: r.hostedPreviewSlug?.trim() ?? null,
              });
            }
            return;
          } catch (e) {
            clearTimeout(timer);
            const isAbort = e instanceof DOMException && e.name === "AbortError";
            const isNetworkFailure =
              isAbort ||
              (e instanceof TypeError && /failed to fetch|network/i.test(e.message));
            lastError = isAbort
              ? "Design generation timed out. The design may have been created in Google Stitch. Please try again."
              : e instanceof Error
                ? e.message
                : "Stitch request failed.";
            if (isNetworkFailure && attempt < MAX_ATTEMPTS - 1) {
              await new Promise((r) => setTimeout(r, 3000));
              continue;
            }
            break;
          }
        }
        setErrorForTarget(target, lastError);
        setResultForTarget(target, null);
      } finally {
        setBusyForTarget(target, false);
      }
    },
    [buildStitchPayload, onHostedPreviewReady]
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
    selectedOffer === "branding"
      ? Boolean(resolvedBusinessName && hasBrandShareAttachment)
      : selectedOffer === "audit"
        ? Boolean(
            resolvedBusinessName && (hasAuditShareAttachment || hasAuditReportAttachment),
          )
      : selectedOffer !== "automations" &&
          Boolean(hostedPreviewIdForSelection && resolvedBusinessName);

  const mergedPreviewUrlForSelection = useMemo(() => {
    const id = hostedPreviewIdForSelection;
    if (
      selectedOffer === "automations" ||
      selectedOffer === "branding" ||
      selectedOffer === "audit"
    ) {
      return "";
    }
    return id ? buildClientPreviewLink(id, hostedPreviewSlugForSelection) : "";
  }, [selectedOffer, hostedPreviewIdForSelection, hostedPreviewSlugForSelection]);

  const mergedInstagramMessage = useMemo(
    () =>
      mergeProspectOutreachTemplate(activeShareTpl.instagramBody, {
        previewUrl: mergedPreviewUrlForSelection,
        businessName: resolvedBusinessName,
        yourName: yourName.trim(),
      }),
    [activeShareTpl.instagramBody, mergedPreviewUrlForSelection, resolvedBusinessName, yourName],
  );

  const mergedWhatsappMessage = useMemo(
    () =>
      mergeProspectOutreachTemplate(activeShareTpl.whatsappBody, {
        previewUrl: mergedPreviewUrlForSelection,
        businessName: resolvedBusinessName,
        yourName: yourName.trim(),
      }),
    [activeShareTpl.whatsappBody, mergedPreviewUrlForSelection, resolvedBusinessName, yourName],
  );

  const mergedFacebookMessage = useMemo(
    () =>
      mergeProspectOutreachTemplate(activeShareTpl.facebookBody, {
        previewUrl: mergedPreviewUrlForSelection,
        businessName: resolvedBusinessName,
        yourName: yourName.trim(),
      }),
    [activeShareTpl.facebookBody, mergedPreviewUrlForSelection, resolvedBusinessName, yourName],
  );

  const canCopyInstagramMessage =
    selectedOffer === "automations" ||
    selectedOffer === "branding" ||
    selectedOffer === "audit" ||
    (Boolean(hostedPreviewIdForSelection) && Boolean(resolvedBusinessName));

  const canSendWhatsappMessage = canCopyInstagramMessage;
  const canCopyFacebookMessage = canCopyInstagramMessage;

  const serializeAttachments = useCallback(async (excludeIds = new Set<string>()) => {
    const out: SerializedOutreachAttachment[] = [];
    for (const att of outreachAttachments) {
      if (excludeIds.has(att.id)) continue;
      out.push(await serializeBlobAttachment(att.name, att.blob));
    }
    return out;
  }, [outreachAttachments]);

  const buildBeforeAfterEmailFallback = useCallback(async (): Promise<
    | { attachment: SerializedOutreachAttachment; sourceAttachmentId?: string }
    | undefined
  > => {
    const existing = outreachAttachments.find(
      (att) => att.id === "before-after-image" && att.blob.type.startsWith("image/"),
    );
    if (existing) {
      return {
        attachment: await serializeBlobAttachment(existing.name, existing.blob),
        sourceAttachmentId: existing.id,
      };
    }

    if (!existingWebsiteUrl || !stitchPreviewImageUrlForSelection) return undefined;
    try {
      const blob = await composeBeforeAfterImage({
        beforeImageUrl: `/api/prospecting/website-snapshot?url=${encodeURIComponent(existingWebsiteUrl)}`,
        afterImageUrl: stitchPreviewImageUrlForSelection,
        businessName: resolvedBusinessName,
      });
      return {
        attachment: await serializeBlobAttachment("before-after-comparison.png", blob),
      };
    } catch {
      return undefined;
    }
  }, [
    existingWebsiteUrl,
    outreachAttachments,
    resolvedBusinessName,
    stitchPreviewImageUrlForSelection,
  ]);

  const sendSms = useCallback(async () => {
    const id = hostedPreviewIdForSelection;
    if (!canSharePreview || !smsTo.trim()) {
      setShareMsg(
        selectedOffer === "branding"
          ? "Add a phone number and generate the brand share image first."
          : selectedOffer === "audit"
            ? "Add a phone number and generate the summary image or the Revenue Leak Audit PDF first."
            : "Add a phone number and select a card with a hosted preview.",
      );
      return;
    }
    setShareBusy("sms");
    setShareMsg(null);
    const extraAttachments = await serializeAttachments();
    const res = await sendProspectPreviewSmsAction({
      previewId: id ?? undefined,
      leadId: linkedLeadId?.trim() || null,
      to: smsTo.trim(),
      bodyTemplate: shareTemplates[selectedOffer].smsBody,
      businessName: resolvedBusinessName,
      yourName: yourName.trim() || undefined,
      includeMmsImage: attachPreviewImage,
      stitchPreviewImageUrl: stitchPreviewImageUrlForSelection,
      extraAttachments: extraAttachments.length ? extraAttachments : undefined,
    });
    setShareBusy(null);
    if (res.ok) {
      setShareMsg("SMS sent.");
    } else {
      setShareMsg(res.error);
    }
  }, [
    canSharePreview,
    hostedPreviewIdForSelection,
    stitchPreviewImageUrlForSelection,
    selectedOffer,
    shareTemplates,
    smsTo,
    resolvedBusinessName,
    yourName,
    attachPreviewImage,
    linkedLeadId,
    serializeAttachments,
  ]);

  const sendEmail = useCallback(async () => {
    const id = hostedPreviewIdForSelection;
    if (!canSharePreview || !emailTo.trim()) {
      setShareMsg(
        selectedOffer === "branding"
          ? "Add an email address and generate the brand share image first."
          : selectedOffer === "audit"
            ? "Add an email address and generate the summary image or the Revenue Leak Audit PDF first."
            : "Add an email address and select a card with a hosted preview.",
      );
      return;
    }
    setShareBusy("email");
    setShareMsg(null);
    const beforeAfterFallback = await buildBeforeAfterEmailFallback();
    const extraAttachments = await serializeAttachments(
      beforeAfterFallback?.sourceAttachmentId
        ? new Set([beforeAfterFallback.sourceAttachmentId])
        : undefined,
    );
    const res = await sendProspectPreviewEmailAction({
      previewId: id ?? undefined,
      leadId: linkedLeadId?.trim() || null,
      to: emailTo.trim(),
      subjectTemplate: shareTemplates[selectedOffer].emailSubject,
      bodyTemplate: shareTemplates[selectedOffer].emailBody,
      businessName: resolvedBusinessName,
      yourName: yourName.trim() || undefined,
      stitchPreviewImageUrl: stitchPreviewImageUrlForSelection,
      beforeAfterImage: beforeAfterFallback?.attachment,
      extraAttachments: extraAttachments.length ? extraAttachments : undefined,
    });
    setShareBusy(null);
    if (res.ok) {
      setShareMsg(
        res.emailChannel === "resend"
          ? "Email sent. Replies are not shown in Conversations when using the Resend integration—connect SendGrid and Inbound Parse under Settings → Integrations → SendGrid for reply ingestion."
          : "Email sent.",
      );
    } else {
      setShareMsg(res.error);
    }
  }, [
    canSharePreview,
    hostedPreviewIdForSelection,
    stitchPreviewImageUrlForSelection,
    selectedOffer,
    shareTemplates,
    emailTo,
    resolvedBusinessName,
    yourName,
    buildBeforeAfterEmailFallback,
    linkedLeadId,
    serializeAttachments,
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

  const openWhatsappChat = useCallback(() => {
    if (!canSendWhatsappMessage) {
      setShareMsg(
        "Generate a hosted preview and keep Website, Web app, or Mobile selected to include {{previewUrl}}, or choose AI audit / Brand guidelines for a text-only message.",
      );
      return;
    }
    const url = buildWhatsappDeepLink(whatsappTo, mergedWhatsappMessage);
    if (!url) {
      setShareMsg(
        "Enter a WhatsApp number with country code (e.g. +1 555 123 4567) or a wa.me URL.",
      );
      return;
    }
    setShareMsg(null);
    window.open(url, "_blank", "noopener,noreferrer");
  }, [canSendWhatsappMessage, whatsappTo, mergedWhatsappMessage]);

  const copyWhatsappMessage = useCallback(async () => {
    if (!canSendWhatsappMessage) {
      setShareMsg(
        "Generate a hosted preview and keep Website, Web app, or Mobile selected to include {{previewUrl}}, or choose AI audit / Brand guidelines for a text-only message.",
      );
      return;
    }
    setShareMsg(null);
    try {
      await navigator.clipboard.writeText(mergedWhatsappMessage);
      setShareMsg("WhatsApp message copied. Paste it in WhatsApp Web or the mobile app.");
    } catch {
      setShareMsg("Could not copy (browser blocked).");
    }
  }, [canSendWhatsappMessage, mergedWhatsappMessage]);

  const copyFacebookMessage = useCallback(async () => {
    if (!canCopyFacebookMessage) {
      setShareMsg(
        "Generate a hosted preview and keep Website, Web app, or Mobile selected to include {{previewUrl}}, or choose AI audit / Brand guidelines for a text-only message.",
      );
      return;
    }
    setShareMsg(null);
    try {
      await navigator.clipboard.writeText(mergedFacebookMessage);
      setShareMsg(
        "Facebook message copied. Open Messenger or the page's Facebook profile and paste — Meta does not offer a one-click third-party DM API for arbitrary recipients.",
      );
    } catch {
      setShareMsg("Could not copy (browser blocked).");
    }
  }, [canCopyFacebookMessage, mergedFacebookMessage]);

  const openFacebookHandoff = useCallback(() => {
    const url = normalizeFacebookHandoffUrl(facebookTo);
    if (!url) {
      setShareMsg("Enter their Facebook page URL (https://facebook.com/…) or m.me/<handle>.");
      return;
    }
    setShareMsg(null);
    window.open(url, "_blank", "noopener,noreferrer");
  }, [facebookTo]);

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

  const fetchAuditPayload = useCallback(async (): Promise<
    { ok: true; audit: RevenueLeakAudit } | { ok: false; error: string }
  > => {
    if (stitchContext?.kind !== "place") {
      return {
        ok: false,
        error: "Select a Google Business listing to run the Revenue Leak Audit.",
      };
    }
    const place = stitchContext.place;
    if (auditSnapshot && auditSnapshotPlaceId === place.id) {
      return { ok: true, audit: auditSnapshot };
    }

    const minimalBusiness = minimalBusinessFromPlace(place);

    const analyzeRes = await fetch("/api/revenue-leak-audit/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ business: minimalBusiness, assumptions: {} }),
    });
    const analyzeText = await analyzeRes.text();
    let analyzeJson: { ok?: boolean; audit?: unknown; error?: string } | null = null;
    try {
      analyzeJson = analyzeText ? JSON.parse(analyzeText) : null;
    } catch {
      analyzeJson = null;
    }
    if (!analyzeRes.ok || !analyzeJson?.ok || !analyzeJson.audit) {
      return {
        ok: false,
        error:
          analyzeJson?.error ||
          `Audit analysis failed (${analyzeRes.status}). ${analyzeText.slice(0, 200)}`,
      };
    }
    const raw = analyzeJson.audit;
    if (
      !raw ||
      typeof raw !== "object" ||
      typeof (raw as { business?: unknown }).business !== "object" ||
      (raw as { business: unknown }).business === null ||
      typeof (raw as { business: { name?: unknown } }).business.name !== "string" ||
      typeof (raw as { scores?: unknown }).scores !== "object" ||
      (raw as { scores: unknown }).scores === null ||
      typeof (raw as { moneySummary?: unknown }).moneySummary !== "object" ||
      (raw as { moneySummary: unknown }).moneySummary === null ||
      !Array.isArray((raw as { findings?: unknown }).findings)
    ) {
      return { ok: false, error: "Audit analysis returned an unexpected shape." };
    }
    const audit = raw as RevenueLeakAudit;
    setAuditSnapshot(audit);
    setAuditSnapshotPlaceId(place.id);
    return { ok: true, audit };
  }, [auditSnapshot, auditSnapshotPlaceId, stitchContext]);

  const generateAuditReportPdf = useCallback(async () => {
    if (stitchContext?.kind !== "place") {
      setAuditMsg("Select a Google Business listing to run the Revenue Leak Audit.");
      return;
    }
    const place = stitchContext.place;
    setAuditBusy(true);
    setAuditBlob(null);
    setAuditFilename(null);
    const cacheHit = Boolean(auditSnapshot && auditSnapshotPlaceId === place.id);
    setAuditMsg(cacheHit ? "Building PDF report…" : "Running Revenue Leak Audit…");
    try {
      const payloadResult = await fetchAuditPayload();
      if (!payloadResult.ok) {
        setAuditMsg(payloadResult.error);
        return;
      }
      const audit = payloadResult.audit;

      setAuditMsg("Building PDF report…");
      const pdfRes = await fetch("/api/revenue-leak-audit/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ audit }),
      });
      if (!pdfRes.ok) {
        const errText = await pdfRes.text().catch(() => "");
        let errJson: { error?: string } | null = null;
        try {
          errJson = errText ? JSON.parse(errText) : null;
        } catch {
          errJson = null;
        }
        setAuditMsg(errJson?.error || `PDF build failed (${pdfRes.status}).`);
        return;
      }
      const blob = await pdfRes.blob();
      const businessSlug = (place.name || "business")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 60);
      const filename = `${businessSlug || "business"}-revenue-leak-audit.pdf`;
      setAuditBlob(blob);
      setAuditFilename(filename);
      addOutreachAttachment({
        id: "audit-report-pdf",
        name: filename,
        blob,
        source: "suggested",
      });
      setSelectedOffer("audit");
      try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        // Download fallback - the blob is still attached for outreach.
      }
      setAuditMsg("Audit report ready and attached for outreach.");
    } catch (e) {
      setAuditMsg(e instanceof Error ? e.message : "Audit request failed.");
    } finally {
      setAuditBusy(false);
    }
  }, [
    addOutreachAttachment,
    auditSnapshot,
    auditSnapshotPlaceId,
    fetchAuditPayload,
    stitchContext,
  ]);

  const generateAuditShareImage = useCallback(async () => {
    if (stitchContext?.kind !== "place") {
      setAuditShareMsg("Select a Google Business listing to run the Revenue Leak Audit.");
      return;
    }
    setAuditShareBusy(true);
    setAuditShareMsg(null);
    setAuditShareBlob(null);
    setAuditShareFilename(null);
    try {
      const payloadResult = await fetchAuditPayload();
      if (!payloadResult.ok) {
        setAuditShareMsg(payloadResult.error);
        return;
      }
      const { svg, width, height, filename } = renderAuditShareImage(payloadResult.audit);
      const blob = await convertSvgToPngBlob(svg, width, height);
      setAuditShareBlob(blob);
      setAuditShareFilename(filename);
      addOutreachAttachment({
        id: "audit-share-image",
        name: filename,
        blob,
        source: "suggested",
      });
      setSelectedOffer("audit");
      try {
        downloadBlob(blob, filename);
      } catch {
        // Summary PNG is still attached for outreach.
      }
      setAuditShareMsg("Summary image ready and attached for outreach.");
    } catch (e) {
      setAuditShareMsg(e instanceof Error ? e.message : "Summary image request failed.");
    } finally {
      setAuditShareBusy(false);
    }
  }, [addOutreachAttachment, fetchAuditPayload, stitchContext]);

  const generateBrandingShareImage = useCallback(async () => {
    setBrandingShareBusy(true);
    setBrandingShareMsg(null);
    setBrandingShareBlob(null);
    setBrandingShareFilename(null);
    try {
      const http = await fetch("/api/prospecting/branding-share-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          businessName: resolvedBusinessName,
          place: stitchContext?.kind === "place" ? stitchContext.place : null,
          report: marketIntelReport ?? null,
          leadId: linkedLeadId?.trim() || null,
        }),
      });
      const text = await http.text();
      let res: BrandingShareImageResult | null = null;
      if (text) {
        try {
          res = JSON.parse(text) as BrandingShareImageResult;
        } catch {
          res = null;
        }
      }
      if (!res) {
        setBrandingShareMsg(
          http.ok
            ? "Share image finished but the server returned an invalid response."
            : `Share image failed (${http.status}): ${text.slice(0, 240) || http.statusText}`,
        );
        return;
      }
      if (!res.ok) {
        setBrandingShareMsg(res.error);
        return;
      }

      const blob = await convertSvgToPngBlob(res.svg, res.width, res.height);
      const filename = res.filename || "brand-kit-sales-funnel-preview.png";
      setBrandingShareBlob(blob);
      setBrandingShareFilename(filename);
      addOutreachAttachment({
        id: "brand-share-image",
        name: filename,
        blob,
        source: "suggested",
      });
      setSelectedOffer("branding");
      setBrandingShareMsg("Share image ready and attached.");
    } catch (e) {
      setBrandingShareMsg(e instanceof Error ? e.message : "Share image request failed.");
    } finally {
      setBrandingShareBusy(false);
    }
  }, [
    addOutreachAttachment,
    linkedLeadId,
    marketIntelReport,
    resolvedBusinessName,
    stitchContext,
  ]);

  const generateBrandingPdf = useCallback(async () => {
    setBrandingBusy(true);
    setBrandingMsg(null);
    setBrandingPdfUrl(null);
    try {
      const http = await fetch("/api/prospecting/branding-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          businessName: resolvedBusinessName,
          place: stitchContext?.kind === "place" ? stitchContext.place : null,
          report: marketIntelReport ?? null,
          leadId: linkedLeadId?.trim() || null,
        }),
      });
      const text = await http.text();
      let res: BrandingPdfResult | null = null;
      if (text) {
        try {
          res = JSON.parse(text) as BrandingPdfResult;
        } catch {
          res = null;
        }
      }
      if (!res) {
        setBrandingMsg(
          http.ok
            ? "Brand Kit PDF finished but the server returned an invalid response."
            : `Brand Kit PDF failed (${http.status}): ${text.slice(0, 240) || http.statusText}`,
        );
        return;
      }
      if (!res.ok) {
        setBrandingMsg(res.error);
        return;
      }
      setBrandingFilename(res.filename);
      setBrandingPdfUrl(res.pdfUrl);
      if (res.imageWarnings && res.imageWarnings.length > 0) {
        const head = res.imageWarnings.slice(0, 2).join("; ");
        const extra =
          res.imageWarnings.length > 2
            ? ` (+${res.imageWarnings.length - 2} more)`
            : "";
        setBrandingMsg(
          `Downloaded with placeholder imagery — ${res.imageWarnings.length} image slot(s) used fallbacks: ${head}${extra}. See server logs for details.`,
        );
      } else {
        setBrandingMsg("Brand guidelines downloaded.");
      }
      if (!linkedLeadId?.trim()) {
        onBrandingPdfReady?.({
          pdfPath: res.pdfPath,
          pdfUrl: res.pdfUrl,
          filename: res.filename,
        });
      }
      try {
        const a = document.createElement("a");
        a.href = res.pdfUrl;
        a.download = res.filename;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
      } catch {
        setBrandingMsg("Could not start download in this browser.");
      }
    } catch (e) {
      setBrandingMsg(e instanceof Error ? e.message : "Brand guidelines PDF request failed.");
    } finally {
      setBrandingBusy(false);
    }
  }, [
    marketIntelReport,
    resolvedBusinessName,
    stitchContext,
    linkedLeadId,
    onBrandingPdfReady,
  ]);

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
          also use <span className="font-mono">{"{{yourName}}"}</span> (from your CRM context when provided).
          Revenue Leak Audit templates default to a summary image first and the full PDF as follow-up.
        </p>
        {stitchContext ? (
          <p className="mt-3 rounded-lg border border-border/60 bg-white/40 px-2.5 py-2 text-[11px] text-text-secondary dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
            {stitchBrandingSummary(stitchContext)}
          </p>
        ) : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              Five-page premium website concept in one design (home, services, about, social proof, book/contact) with
              real blocks for booking, reviews, services, and contact — uses your Google Business Profile for branding
              context.{" "}
              {placeVsUrlIntro}
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
                  onVideoReady={(b) => { parentVideoBlobRef.current = b; setHasVideoBlob(true); }}
                />
                {existingWebsiteUrl ? (
                  <BeforeAfterComparison
                    existingWebsiteUrl={existingWebsiteUrl}
                    stitchResult={stitchWebResult}
                    businessName={resolvedBusinessName}
                  />
                ) : null}
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
              Premium desktop operator dashboard with pipeline, clients, inbox, schedule, and reviews.{" "}
              {placeVsUrlIntro}
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
                  onVideoReady={(b) => { parentVideoBlobRef.current = b; setHasVideoBlob(true); }}
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
              Premium phone-sized owner app with bookings, clients, inbox, schedule snapshots, and review growth.{" "}
              {placeVsUrlIntro}
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
                {stitchMobileBusy ? "Generating…" : "Generate mobile app"}
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
                  onVideoReady={(b) => { parentVideoBlobRef.current = b; setHasVideoBlob(true); }}
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

          {/* Audit Report (Revenue Leak) */}
          <div
            className={`cursor-pointer rounded-lg border border-border/70 bg-white/50 p-3 text-left dark:border-zinc-700/80 dark:bg-zinc-900/50 ${cardRing("audit")}`}
            onClick={() => setSelectedOffer("audit")}
          >
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-text-secondary/80 dark:text-zinc-500">
                Audit Report
              </h4>
              <ShieldAlert className="h-4 w-4 shrink-0 text-text-secondary opacity-70 dark:text-zinc-500" aria-hidden />
            </div>
            <p className="mt-2 text-[11px] leading-snug text-text-secondary dark:text-zinc-400">
              Start with a 1200×900 summary image for SMS, email, or DMs (score, money at risk, top findings). Generate
              the full Revenue Leak Audit PDF as the follow-up: ranking vs competitors, GBP health, review trust +
              competitor themes, website conversion, tracking &amp; ads readiness, photos, schema, local SEO, and
              money-loss estimates with a prioritized fix plan. Same engine as the Revenue Leak Audit tool.
            </p>
            <p className="mt-2 text-[10px] text-text-secondary/90 dark:text-zinc-500">
              Analysis can take 1–2 minutes (Google Places + PageSpeed + competitor reviews). Assets auto-attach for
              SMS / email / WhatsApp.
            </p>
            <button
              type="button"
              disabled={stitchContext?.kind !== "place" || auditBusy || auditShareBusy}
              onClick={(e) => {
                e.stopPropagation();
                void generateAuditShareImage();
              }}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-500/[0.14] disabled:opacity-50 dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
            >
              {auditShareBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <ImageDown className="h-3.5 w-3.5" aria-hidden />}
              {auditShareBusy ? "Composing summary…" : "Generate summary image"}
            </button>
            {auditShareMsg ? (
              <p className="mt-2 text-[11px] text-text-secondary dark:text-zinc-400" role="status">
                {auditShareMsg}
                {auditShareFilename ? <span className="ml-1 font-mono text-[10px]">{auditShareFilename}</span> : null}
              </p>
            ) : null}
            {auditShareBlob && auditShareFilename ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadBlob(auditShareBlob, auditShareFilename);
                }}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-500/[0.14] dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
              >
                <ImageDown className="h-3.5 w-3.5" aria-hidden />
                Download image
              </button>
            ) : null}
            <button
              type="button"
              disabled={stitchContext?.kind !== "place" || auditBusy || auditShareBusy}
              onClick={(e) => {
                e.stopPropagation();
                void generateAuditReportPdf();
              }}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-500/[0.14] disabled:opacity-50 dark:border-blue-400/35 dark:bg-blue-500/15 dark:text-blue-200 dark:hover:bg-blue-500/20"
            >
              {auditBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <FileDown className="h-3.5 w-3.5" aria-hidden />}
              {auditBusy ? "Building report…" : "Generate report (PDF)"}
            </button>
            {stitchContext?.kind !== "place" ? (
              <p className="mt-2 text-[11px] text-text-secondary/90 dark:text-zinc-500">
                Pick a Google Business listing in the prospect intel step to enable this report.
              </p>
            ) : null}
            {auditMsg ? (
              <p className="mt-2 text-[11px] text-text-secondary dark:text-zinc-400" role="status">
                {auditMsg}
                {auditFilename ? <span className="ml-1 font-mono text-[10px]">{auditFilename}</span> : null}
              </p>
            ) : null}
            {auditBlob && auditFilename ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadBlob(auditBlob, auditFilename);
                }}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500/35 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-500/[0.14] dark:border-blue-400/35 dark:bg-blue-500/15 dark:text-blue-200 dark:hover:bg-blue-500/20"
              >
                <FileDown className="h-3.5 w-3.5" aria-hidden />
                Download PDF
              </button>
            ) : null}
          </div>

          {/* Brand kit + sales funnel (PDF) */}
          <div
            className={`cursor-pointer rounded-lg border border-border/70 bg-white/50 p-3 text-left dark:border-zinc-700/80 dark:bg-zinc-900/50 ${cardRing("branding")}`}
            onClick={() => setSelectedOffer("branding")}
          >
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-text-secondary/80 dark:text-zinc-500">
                Brand kit + sales funnel
              </h4>
              <Palette className="h-4 w-4 shrink-0 text-text-secondary opacity-70 dark:text-zinc-500" aria-hidden />
            </div>
            <p className="mt-2 text-[11px] leading-snug text-text-secondary dark:text-zinc-400">
              Start with a 1200×900 share image for SMS, email, or manual outreach. It summarizes the prospect&apos;s
              palette, typography, website direction, and campaign assets. Then generate the detailed PDF as the
              follow-up brand book and sales-funnel strategy.
            </p>
            <button
              type="button"
              disabled={brandingShareBusy}
              onClick={(e) => {
                e.stopPropagation();
                void generateBrandingShareImage();
              }}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-500/[0.14] disabled:opacity-50 dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
            >
              {brandingShareBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <ImageDown className="h-3.5 w-3.5" aria-hidden />}
              {brandingShareBusy ? "Composing image…" : "Generate Image"}
            </button>
            {brandingShareMsg ? (
              <p className="mt-2 text-[11px] text-text-secondary dark:text-zinc-400" role="status">
                {brandingShareMsg}
                {brandingShareFilename ? <span className="ml-1 font-mono text-[10px]">{brandingShareFilename}</span> : null}
              </p>
            ) : null}
            {brandingShareBlob && brandingShareFilename ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  downloadBlob(brandingShareBlob, brandingShareFilename);
                }}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-500/[0.14] dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
              >
                <ImageDown className="h-3.5 w-3.5" aria-hidden />
                Download image
              </button>
            ) : null}
            <button
              type="button"
              disabled={brandingBusy || brandingShareBusy}
              onClick={(e) => {
                e.stopPropagation();
                void generateBrandingPdf();
              }}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-500/[0.14] disabled:opacity-50 dark:border-blue-400/35 dark:bg-blue-500/15 dark:text-blue-200 dark:hover:bg-blue-500/20"
            >
              {brandingBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Palette className="h-3.5 w-3.5" aria-hidden />}
              {brandingBusy ? "Composing brand kit + funnel…" : "Generate brand kit & funnel (PDF)"}
            </button>
            {brandingBusy ? (
              <p className="mt-2 text-[11px] text-text-secondary/80 dark:text-zinc-500" aria-live="polite">
                Generating… this can take 2–3 minutes (13 AI images + brand & funnel copy).
              </p>
            ) : null}
            {brandingMsg ? (
              <p className="mt-2 text-[11px] text-text-secondary dark:text-zinc-400" role="status">
                {brandingMsg}
                {brandingFilename ? <span className="ml-1 font-mono text-[10px]">{brandingFilename}</span> : null}
              </p>
            ) : null}
            {brandingPdfUrl ? (
              <a
                href={brandingPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={brandingFilename || undefined}
                onClick={(e) => e.stopPropagation()}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-500/[0.14] dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
              >
                <FileDown className="h-3.5 w-3.5" aria-hidden />
                Download PDF
              </a>
            ) : null}
          </div>
        </div>

        <div className="mt-6 border-t border-border/60 pt-4 dark:border-zinc-700/60">
          <p className="text-[11px] font-medium text-text-secondary dark:text-zinc-400">
            Share outreach
            {selectedOffer === "website" ||
            selectedOffer === "webapp" ||
            selectedOffer === "mobile" ? (
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
            ) : selectedOffer === "automations" ? (
              <>
                {" "}
                · templates for <span className="text-text-primary dark:text-zinc-200">AI audit</span> (hosted link send
                requires Website, Web app, or Mobile)
              </>
            ) : selectedOffer === "audit" ? (
              <>
                {" "}
                · templates for{" "}
                <span className="text-text-primary dark:text-zinc-200">Revenue Leak Audit</span> (generate the summary
                image or PDF first to attach it)
              </>
            ) : (
              <>
                {" "}
                · templates for <span className="text-text-primary dark:text-zinc-200">Brand guidelines</span> (generate
                the share image first to attach it)
              </>
            )}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/mp4,video/webm,application/pdf"
            onChange={handleFilePick}
            className="hidden"
          />

          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 lg:items-stretch">
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
                sign-off when your profile supplies it. Subject and body can differ per service type. A Stitch
                preview image is embedded when available; before/after is the backup, never a Vercel login preview.
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
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  disabled={!canSharePreview || shareBusy !== null || !emailTo.trim()}
                  onClick={() => void sendEmail()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2.5 text-xs font-semibold text-sky-900 disabled:opacity-50 dark:border-sky-400/35 dark:bg-sky-500/15 dark:text-sky-100"
                >
                  {shareBusy === "email" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Mail className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Send email
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative rounded-lg border border-zinc-300/70 p-2 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-600/60 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  aria-label="Attach files to email"
                  title="Attach files"
                >
                  <Paperclip className="h-4 w-4" aria-hidden />
                  {outreachAttachments.length > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[9px] font-bold text-white">
                      {outreachAttachments.length}
                    </span>
                  )}
                </button>
              </div>
            </section>

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
                {selectedOffer === "automations" || selectedOffer === "branding" || selectedOffer === "audit" ? (
                  <> — <span className="font-mono">{"{{previewUrl}}"}</span> usually omitted for attachment-first outreach.</>
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
                  Attach preview image for MMS: uses the Stitch preview image first. Email uses Stitch first,
                  before/after as backup, and skips hosted screenshots that can show Vercel auth.
                </span>
              </label>
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  disabled={!canSharePreview || shareBusy !== null || !smsTo.trim()}
                  onClick={() => void sendSms()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-900 disabled:opacity-50 dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-100"
                >
                  {shareBusy === "sms" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Send SMS
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative rounded-lg border border-zinc-300/70 p-2 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-600/60 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  aria-label="Attach files to SMS"
                  title="Attach files"
                >
                  <Paperclip className="h-4 w-4" aria-hidden />
                  {outreachAttachments.length > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                      {outreachAttachments.length}
                    </span>
                  )}
                </button>
              </div>
            </section>

            <section
              className="flex min-h-0 flex-col rounded-xl border border-border/70 bg-white/45 p-4 dark:border-zinc-700/70 dark:bg-zinc-900/35"
              aria-labelledby="prospect-share-whatsapp-heading"
            >
              <div className="flex items-center gap-2 border-b border-border/50 pb-2 dark:border-zinc-700/50">
                <MessageCircle className="h-4 w-4 text-emerald-700/80 dark:text-emerald-400/90" aria-hidden />
                <h4
                  id="prospect-share-whatsapp-heading"
                  className="text-xs font-semibold uppercase tracking-widest text-text-secondary/85 dark:text-zinc-400"
                >
                  WhatsApp
                </h4>
              </div>
              <p className="mt-2 text-[10px] leading-snug text-text-secondary dark:text-zinc-500">
                Same merge tags as SMS. Opens the official{" "}
                <span className="font-mono">wa.me</span> click-to-chat link with the message pre-filled — the
                user confirms the send in WhatsApp. Use a phone number with country code (no automated send
                without WhatsApp Business API).
              </p>
              <label className="mb-1 mt-3 block text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                Phone (with country code) or wa.me URL
              </label>
              <input
                type="text"
                value={whatsappTo}
                onChange={(e) => setWhatsappTo(e.target.value)}
                placeholder="+1 555 123 4567 or https://wa.me/15551234567"
                className="w-full rounded-lg border border-border px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
              />
              <label className="mb-1 mt-3 block text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                Message
              </label>
              <textarea
                value={activeShareTpl.whatsappBody}
                onChange={(e) => updateActiveShareTemplates({ whatsappBody: e.target.value })}
                rows={5}
                className="min-h-[7.5rem] w-full flex-1 rounded-lg border border-border px-2 py-1.5 font-mono text-[11px] dark:border-zinc-700 dark:bg-zinc-900"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!canSendWhatsappMessage || shareBusy !== null || !normalizeWhatsappDigits(whatsappTo)}
                  onClick={() => openWhatsappChat()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-900 disabled:opacity-50 dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-100 sm:w-auto"
                >
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                  Open WhatsApp
                </button>
                <button
                  type="button"
                  disabled={!canSendWhatsappMessage || shareBusy !== null}
                  onClick={() => void copyWhatsappMessage()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-xs font-semibold text-text-primary disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-100 sm:w-auto"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                  Copy message
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

            <section
              className="flex min-h-0 flex-col rounded-xl border border-border/70 bg-white/45 p-4 dark:border-zinc-700/70 dark:bg-zinc-900/35"
              aria-labelledby="prospect-share-facebook-heading"
            >
              <div className="flex items-center gap-2 border-b border-border/50 pb-2 dark:border-zinc-700/50">
                <Facebook className="h-4 w-4 text-blue-700/85 dark:text-blue-400/90" aria-hidden />
                <h4
                  id="prospect-share-facebook-heading"
                  className="text-xs font-semibold uppercase tracking-widest text-text-secondary/85 dark:text-zinc-400"
                >
                  Facebook
                </h4>
              </div>
              <p className="mt-2 text-[10px] leading-snug text-text-secondary dark:text-zinc-500">
                Same merge tags as SMS. There is no supported way for this app to send Facebook DMs directly;
                copy the message, then open Messenger (<span className="font-mono">m.me/&lt;page&gt;</span>) or
                their Facebook profile and paste in a DM (or wire up Meta&apos;s Business API with your own
                app for automation).
              </p>
              <label className="mb-1 mt-3 block text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                Page URL or m.me/&lt;handle&gt;
              </label>
              <input
                type="text"
                value={facebookTo}
                onChange={(e) => setFacebookTo(e.target.value)}
                placeholder="https://www.facebook.com/theirbrand or https://m.me/theirbrand"
                className="w-full rounded-lg border border-border px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
              />
              <label className="mb-1 mt-3 block text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
                Message
              </label>
              <textarea
                value={activeShareTpl.facebookBody}
                onChange={(e) => updateActiveShareTemplates({ facebookBody: e.target.value })}
                rows={5}
                className="min-h-[7.5rem] w-full flex-1 rounded-lg border border-border px-2 py-1.5 font-mono text-[11px] dark:border-zinc-700 dark:bg-zinc-900"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!canCopyFacebookMessage || shareBusy !== null}
                  onClick={() => void copyFacebookMessage()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-4 py-2.5 text-xs font-semibold text-blue-950 disabled:opacity-50 dark:border-blue-400/35 dark:bg-blue-500/15 dark:text-blue-100 sm:w-auto"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                  Copy message
                </button>
                <button
                  type="button"
                  disabled={shareBusy !== null || !normalizeFacebookHandoffUrl(facebookTo)}
                  onClick={() => openFacebookHandoff()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-xs font-semibold text-text-primary disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-100 sm:w-auto"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  Open Messenger
                </button>
              </div>
            </section>
          </div>

          {shareMsg ? (
            <p className="mt-4 text-[11px] text-text-secondary dark:text-zinc-400" role="status">
              {shareMsg}
            </p>
          ) : null}

          {outreachAttachments.length > 0 ||
          (hasVideoBlob && parentVideoBlobRef.current && !hasWalkthroughAttachment) ||
          (existingWebsiteUrl && stitchWebResult && !hasBeforeAfterAttachment) ||
          (brandingShareBlob && brandingShareFilename && !hasBrandShareAttachment) ||
          (auditShareBlob && auditShareFilename && !hasAuditShareAttachment) ? (
            <div className="mt-4 rounded-xl border border-border/70 bg-white/50 p-3 dark:border-zinc-700/70 dark:bg-zinc-900/35">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary/85 dark:text-zinc-400">
                    Media to send
                  </p>
                  <p className="mt-1 text-[10px] leading-snug text-text-secondary dark:text-zinc-500">
                    Select the assets to attach for SMS/email. For WhatsApp, Instagram, and Facebook, download or copy the
                    selected media manually.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 rounded-lg border border-zinc-300/70 p-2 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-600/60 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  aria-label="Attach custom files"
                  title="Attach custom files"
                >
                  <Paperclip className="h-4 w-4" aria-hidden />
                </button>
              </div>

              {(hasVideoBlob && parentVideoBlobRef.current && !hasWalkthroughAttachment) ||
              (existingWebsiteUrl && stitchWebResult && !hasBeforeAfterAttachment) ||
              (brandingShareBlob && brandingShareFilename && !hasBrandShareAttachment) ||
              (auditShareBlob && auditShareFilename && !hasAuditShareAttachment) ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {brandingShareBlob && brandingShareFilename && !hasBrandShareAttachment ? (
                    <button
                      type="button"
                      onClick={() => {
                        addOutreachAttachment({
                          id: "brand-share-image",
                          name: brandingShareFilename,
                          blob: brandingShareBlob,
                          source: "suggested",
                        });
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-dashed border-emerald-400/60 px-2.5 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                    >
                      <Plus className="h-3 w-3" aria-hidden />
                      <ImageDown className="h-3.5 w-3.5" aria-hidden />
                      Brand Image
                    </button>
                  ) : null}
                  {auditShareBlob && auditShareFilename && !hasAuditShareAttachment ? (
                    <button
                      type="button"
                      onClick={() => {
                        addOutreachAttachment({
                          id: "audit-share-image",
                          name: auditShareFilename,
                          blob: auditShareBlob,
                          source: "suggested",
                        });
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-dashed border-teal-400/60 px-2.5 py-1 text-[11px] font-medium text-teal-800 hover:bg-teal-50 dark:border-teal-500/40 dark:text-teal-300 dark:hover:bg-teal-500/10"
                    >
                      <Plus className="h-3 w-3" aria-hidden />
                      <ImageDown className="h-3.5 w-3.5" aria-hidden />
                      Audit summary image
                    </button>
                  ) : null}
                  {hasVideoBlob && parentVideoBlobRef.current && !hasWalkthroughAttachment ? (
                    <button
                      type="button"
                      onClick={() => {
                        const blob = parentVideoBlobRef.current;
                        if (!blob) return;
                        addOutreachAttachment({
                          id: "walkthrough-video",
                          name: "homepage-walkthrough.mp4",
                          blob,
                          source: "suggested",
                        });
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-dashed border-purple-400/60 px-2.5 py-1 text-[11px] font-medium text-purple-700 hover:bg-purple-50 dark:border-purple-500/40 dark:text-purple-300 dark:hover:bg-purple-500/10"
                    >
                      <Plus className="h-3 w-3" aria-hidden />
                      <Video className="h-3.5 w-3.5" aria-hidden />
                      Video
                    </button>
                  ) : null}
                  {existingWebsiteUrl && stitchWebResult && !hasBeforeAfterAttachment ? (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const blob = await composeBeforeAfterImage({
                            beforeImageUrl: `/api/prospecting/website-snapshot?url=${encodeURIComponent(existingWebsiteUrl)}`,
                            afterImageUrl: stitchWebResult.imageUrl,
                            businessName: resolvedBusinessName,
                          });
                          addOutreachAttachment({
                            id: "before-after-image",
                            name: "before-after-comparison.png",
                            blob,
                            source: "suggested",
                          });
                        } catch {
                          setShareMsg("Could not create the before/after image.");
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-400/60 px-2.5 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-500/40 dark:text-amber-300 dark:hover:bg-amber-500/10"
                    >
                      <Plus className="h-3 w-3" aria-hidden />
                      <ImageDown className="h-3.5 w-3.5" aria-hidden />
                      Before/After
                    </button>
                  ) : null}
                </div>
              ) : null}

              {outreachAttachments.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {outreachAttachments.map((att) => (
                    <span
                      key={att.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-[11px] dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      {att.blob.type.startsWith("video/") ? (
                        <Video className="h-3.5 w-3.5 text-purple-500" aria-hidden />
                      ) : att.blob.type.startsWith("image/") ? (
                        <ImageDown className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                      ) : (
                        <FileDown className="h-3.5 w-3.5 text-sky-500" aria-hidden />
                      )}
                      <span className="max-w-[180px] truncate">{att.name}</span>
                      <span className="text-[10px] text-text-secondary/70 dark:text-zinc-500">
                        {formatFileSize(att.blob.size)}
                      </span>
                      {att.blob.type.startsWith("image/") || att.blob.type.startsWith("video/") ? (
                        <button
                          type="button"
                          onClick={() => downloadBlob(att.blob, att.name)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          aria-label={`Download ${att.name}`}
                        >
                          <FileDown className="h-2.5 w-2.5" aria-hidden />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeOutreachAttachment(att.id)}
                        className="rounded-full p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        aria-label={`Remove ${att.name}`}
                      >
                        <X className="h-2.5 w-2.5" aria-hidden />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

        </div>
      </div>
    </div>
  );
}
