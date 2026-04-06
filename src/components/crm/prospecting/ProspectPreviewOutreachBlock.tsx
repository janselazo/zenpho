"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  MessageCircle,
  Send,
  Sparkles,
} from "lucide-react";
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
  const [shareTab, setShareTab] = useState<"sms" | "email">("sms");

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

  return (
    <div className="rounded-xl border border-border/80 bg-surface/40 p-4 dark:border-zinc-700/70 dark:bg-zinc-900/50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-text-secondary/80 dark:text-zinc-500">
          Proposed site preview
        </h3>
        <p className="text-[10px] text-text-secondary/80 dark:text-zinc-500">
          Phase 2: Meta/Twilio API DMs · MMS when screenshot is ready
        </p>
      </div>

      {!preview ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-text-secondary dark:text-zinc-400">
            An LLM (Claude if ANTHROPIC_API_KEY is set, otherwise OpenAI) builds a full HTML/CSS page; we host it,
            show a live iframe preview, capture a thumbnail, then you can share by SMS, email, or social handoff.
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

            <div
              className="mt-4 inline-flex w-full max-w-md rounded-lg border border-border/80 bg-border/10 p-1 dark:border-zinc-700 dark:bg-zinc-900/80 sm:w-auto"
              role="tablist"
              aria-label="Outreach channel"
            >
              <button
                type="button"
                role="tab"
                aria-selected={shareTab === "sms"}
                onClick={() => setShareTab("sms")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:flex-initial sm:px-4 ${
                  shareTab === "sms"
                    ? "bg-white text-text-primary shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-text-secondary hover:text-text-primary dark:text-zinc-500 dark:hover:text-zinc-200"
                }`}
              >
                <MessageCircle className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                SMS &amp; social
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={shareTab === "email"}
                onClick={() => setShareTab("email")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:flex-initial sm:px-4 ${
                  shareTab === "email"
                    ? "bg-white text-text-primary shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-text-secondary hover:text-text-primary dark:text-zinc-500 dark:hover:text-zinc-200"
                }`}
              >
                <Mail className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                Email
              </button>
            </div>

            <div className="mt-4 min-h-[12rem]">
              {shareTab === "sms" ? (
                <div className="space-y-4" role="tabpanel">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="prospect-preview-your-name"
                      className="text-xs font-medium text-text-primary dark:text-zinc-300"
                    >
                      Name in message
                    </label>
                    <p className="text-[11px] text-text-secondary dark:text-zinc-500">
                      Fills <span className="font-mono">{"{{yourName}}"}</span>. Defaults to this business; change if
                      you want a different sign-off.
                    </p>
                    <input
                      id="prospect-preview-your-name"
                      value={yourName}
                      onChange={(e) => setYourName(e.target.value)}
                      onBlur={persistTemplates}
                      className="w-full max-w-lg rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none ring-accent/0 transition-shadow focus:border-accent/50 focus:ring-2 focus:ring-accent/20 dark:border-zinc-600 dark:bg-zinc-900"
                    />
                  </div>

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
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
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
              ) : (
                <div className="space-y-4" role="tabpanel">
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
              )}
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
    </div>
  );
}
