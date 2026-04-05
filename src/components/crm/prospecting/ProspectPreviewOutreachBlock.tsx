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
  const [smsBusy, setSmsBusy] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);
  /** True from click until onGenerate settles — parent loading can lag one frame. */
  const [generateClickPending, setGenerateClickPending] = useState(false);
  const [servicesOverride, setServicesOverride] = useState("");
  const [colorVibeOverride, setColorVibeOverride] = useState("");

  useEffect(() => {
    setSmsTemplate(readLs(LS_SMS, DEFAULT_SMS));
    setEmailSubj(readLs(LS_EMAIL_SUBJ, DEFAULT_EMAIL_SUBJ));
    setEmailBody(readLs(LS_EMAIL_BODY, DEFAULT_EMAIL_BODY));
    setYourName(readLs(LS_YOUR_NAME, ""));
  }, []);

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
      return;
    }
    setShotUrl(preview.screenshotUrl);
    setShotStatus(preview.screenshotStatus);
  }, [preview?.previewId, preview?.screenshotUrl, preview?.screenshotStatus]);

  useEffect(() => {
    if (!preview?.previewId) return;
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      const r = await getProspectPreviewStatusAction(preview.previewId);
      if (cancelled || !r.ok) return;
      setShotUrl(r.screenshotUrl);
      setShotStatus(r.screenshotStatus);
      attempts += 1;
      if (r.screenshotStatus === "pending" && attempts < 45) {
        setTimeout(poll, 2500);
      }
    };
    const t = setTimeout(poll, 800);
    return () => {
      cancelled = true;
      clearTimeout(t);
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

          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
              Live preview
            </p>
            <iframe
              title={`Site preview for ${preview.businessName}`}
              src={preview.previewUrl}
              className="mt-2 h-[22rem] w-full max-w-2xl rounded-lg border border-border bg-white dark:border-zinc-700 dark:bg-zinc-950"
              sandbox="allow-same-origin"
            />
          </div>

          <div className="rounded-lg border border-dashed border-border/80 p-3 dark:border-zinc-700">
            <p className="text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
              Thumbnail
            </p>
            {shotStatus === "pending" ? (
              <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary dark:text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Capturing screenshot…
              </div>
            ) : shotStatus === "failed" ? (
              <p className="mt-2 text-xs text-amber-800 dark:text-amber-200/90">
                Screenshot unavailable (check PUBLIC_APP_URL, MICROLINK_API_KEY, or BLOB_READ_WRITE_TOKEN).
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

          <div className="space-y-2">
            <label className="block text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
              Your name (optional placeholder)
            </label>
            <input
              value={yourName}
              onChange={(e) => setYourName(e.target.value)}
              onBlur={persistTemplates}
              className="w-full max-w-md rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              placeholder="Alex"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
              Message template — SMS and social copy ({"{{previewUrl}}"} {"{{businessName}}"} {"{{yourName}}"})
            </label>
            <textarea
              value={smsTemplate}
              onChange={(e) => setSmsTemplate(e.target.value)}
              onBlur={persistTemplates}
              rows={3}
              className="w-full rounded-lg border border-border px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
              Email subject
            </label>
            <input
              value={emailSubj}
              onChange={(e) => setEmailSubj(e.target.value)}
              onBlur={persistTemplates}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <label className="block text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
              Email body
            </label>
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              onBlur={persistTemplates}
              rows={4}
              className="w-full rounded-lg border border-border px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {showSms ? (
              <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
                <input
                  type="tel"
                  value={smsTo}
                  onChange={(e) => setSmsTo(e.target.value)}
                  placeholder="To (E.164)"
                  className="rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
                <button
                  type="button"
                  disabled={smsBusy || !smsTo.trim()}
                  onClick={() => void onSendSms()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  {smsBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Send className="h-4 w-4" aria-hidden />
                  )}
                  Send SMS
                </button>
              </div>
            ) : null}

            {showEmail ? (
              <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="To email"
                  className="rounded-lg border border-border px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
                <button
                  type="button"
                  disabled={emailBusy || !emailTo.trim()}
                  onClick={() => void onSendEmail()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-surface dark:border-zinc-600 dark:hover:bg-zinc-800"
                >
                  {emailBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Mail className="h-4 w-4" aria-hidden />
                  )}
                  Send email (Resend)
                </button>
                <a
                  href={mailtoFallbackHref()}
                  className="text-center text-[11px] font-medium text-accent hover:underline dark:text-blue-400"
                >
                  Open in email app instead
                </a>
              </div>
            ) : null}
          </div>

          {(showFb || showIg) && (
            <div className="flex flex-wrap gap-2 border-t border-border/70 pt-3 dark:border-zinc-800">
              {showFb ? (
                <button
                  type="button"
                  onClick={() => {
                    void copyAndFlash(composedForShare);
                    window.open(fbHandoff ?? "", "_blank", "noopener,noreferrer");
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface dark:border-zinc-600 dark:hover:bg-zinc-800"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  Messenger (copy + open)
                </button>
              ) : null}
              {showIg ? (
                <button
                  type="button"
                  onClick={() => {
                    void copyAndFlash(composedForShare);
                    window.open(igUrl ?? "", "_blank", "noopener,noreferrer");
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-surface dark:border-zinc-600 dark:hover:bg-zinc-800"
                >
                  Instagram (copy + open)
                </button>
              ) : null}
            </div>
          )}

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
