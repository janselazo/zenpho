"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Mail,
  RefreshCw,
  Send,
  Shield,
  XCircle,
  Zap,
} from "lucide-react";
import {
  runSendGridInboundDiagnostic,
  saveSendGridIntegration,
  testSendGridConnection,
  type InboundActivityRow,
  type ReplyToMxCheck,
  type SendGridIntegrationFormState,
  type SendGridInboundLogStatus,
} from "@/app/(crm)/actions/sendgrid-integration";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[box-shadow,border-color] placeholder:text-text-secondary/45 focus:border-accent focus:ring-2 focus:ring-accent/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500";

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-primary dark:text-zinc-200";

const helperClass = "mt-1 text-xs text-text-secondary dark:text-zinc-400";

const cardClass =
  "rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80 sm:p-8";

const SENDGRID_API_KEYS = "https://app.sendgrid.com/settings/api_keys";
const SENDGRID_SENDER = "https://app.sendgrid.com/settings/sender_auth";
const SENDGRID_INBOUND_PARSE =
  "https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook";

type Props = {
  initial: SendGridIntegrationFormState;
  /** Example POST URL for SendGrid Inbound Parse (token must match SENDGRID_INBOUND_WEBHOOK_SECRET). */
  inboundWebhookUrl: string;
  /** True if SENDGRID_INBOUND_WEBHOOK_SECRET is set on the server. */
  inboundSecretConfigured: boolean;
  /** Last 20 entries from sendgrid_inbound_log, newest first. */
  inboundActivity: InboundActivityRow[];
  /**
   * Live MX lookup of the saved Reply-To domain. `null` when Reply-To is empty
   * (the missing-Reply-To amber banner covers that case).
   */
  replyToMx: ReplyToMxCheck | null;
};

type DiagnosticState =
  | { kind: "idle" }
  | { kind: "running" }
  | {
      kind: "done";
      ok: boolean;
      httpStatus?: number;
      message: string;
      conversationHref?: string | null;
    };

export default function SendGridIntegrationSettings({
  initial,
  inboundWebhookUrl,
  inboundSecretConfigured,
  inboundActivity,
  replyToMx,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [showKey, setShowKey] = useState(false);
  const [savePending, startSave] = useTransition();
  const [testPending, startTest] = useTransition();
  const [diagnosticPending, startDiagnostic] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<DiagnosticState>({ kind: "idle" });

  const replyToTrim = initial.replyTo.trim();
  const fromEmailDomain =
    initial.fromEmail.trim().split("@")[1]?.toLowerCase() ?? "";
  const replyToLooksMissing = !replyToTrim;
  const showMissingReplyToWarning =
    replyToLooksMissing &&
    fromEmailDomain.length > 0 &&
    !/^(gmail\.com|outlook\.com|yahoo\.com|icloud\.com|hotmail\.com|protonmail\.com|proton\.me)$/i.test(
      fromEmailDomain
    );
  const showMxMismatchBanner =
    replyToMx?.resolved === true && !replyToMx.pointsToSendGrid;
  const showMxUnresolvedBanner = replyToMx !== null && !replyToMx.resolved;

  function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    startSave(async () => {
      const res = await saveSendGridIntegration(formData);
      if ("error" in res && res.error) {
        setError(res.error);
      } else {
        setMessage("Settings saved. API key encrypted and stored.");
        const apiKeyInput = form.elements.namedItem("api_key");
        if (apiKeyInput instanceof HTMLInputElement) apiKeyInput.value = "";
        router.refresh();
      }
    });
  }

  function onTest() {
    setMessage(null);
    setError(null);
    const el = formRef.current;
    if (!el) return;
    const fd = new FormData(el);
    startTest(async () => {
      const res = await testSendGridConnection(fd);
      if ("error" in res && res.error) setError(res.error);
      else if ("message" in res && res.message) setMessage(res.message);
      else setMessage("Connection OK.");
    });
  }

  function onRunDiagnostic() {
    setDiagnostic({ kind: "running" });
    startDiagnostic(async () => {
      const res = await runSendGridInboundDiagnostic();
      if (!res.ok) {
        setDiagnostic({ kind: "done", ok: false, message: res.error });
        return;
      }
      const conversationHref = res.conversationId
        ? `/conversations/${res.conversationId}`
        : null;
      const summary =
        res.httpStatus === 200
          ? `Webhook responded 200 OK. ${
              res.logId
                ? "A new row was inserted into the inbound activity log."
                : "Could not confirm a log row — check the table below."
            }`
          : `Webhook responded ${res.httpStatus}. Body: ${res.body || "(empty)"}`;
      setDiagnostic({
        kind: "done",
        ok: res.httpStatus === 200,
        httpStatus: res.httpStatus,
        message: summary,
        conversationHref,
      });
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
        Settings
      </p>

      <div className="mt-4 flex flex-wrap items-start gap-4">
        <Link
          href="/settings?tab=integrations"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white text-text-primary shadow-sm transition-colors hover:bg-surface dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Back to integrations"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm"
            aria-hidden
          >
            <Mail className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="heading-display text-2xl font-bold tracking-tight text-text-primary dark:text-zinc-100 sm:text-3xl">
              SendGrid
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary dark:text-zinc-400">
              Transactional email for the CRM (e.g. prospect preview shares). Create an API key and verify your sender
              in SendGrid.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 h-px w-full bg-accent/40" aria-hidden />

      {error ? (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-6 text-sm text-emerald-700 dark:text-emerald-400">{message}</p>
      ) : null}

      <form ref={formRef} onSubmit={handleFormSubmit} className="mt-8 space-y-8">
        <section className={cardClass}>
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
              <Shield className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary dark:text-zinc-100">
                SendGrid credentials
              </h2>
              <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
                Create an API key with Mail Send permission in your{" "}
                <a
                  href={SENDGRID_API_KEYS}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                >
                  SendGrid account
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
                . Verify a{" "}
                <a
                  href={SENDGRID_SENDER}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                >
                  sender identity
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>{" "}
                for the From address below.
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-5">
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor="api_key" className={`${labelClass} mb-0`}>
                  API key
                </label>
                {initial.hasApiKey ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                    <CheckCircle2 className="h-3 w-3" aria-hidden />
                    Saved (encrypted)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    <AlertTriangle className="h-3 w-3" aria-hidden />
                    Not saved yet
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="api_key"
                  name="api_key"
                  type={showKey ? "text" : "password"}
                  autoComplete="new-password"
                  className={`${inputClass} pr-12`}
                  placeholder={
                    initial.hasApiKey
                      ? "Leave blank to keep saved key, or paste a new one to replace it"
                      : "SG.xxxxxxxxxxxx"
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-text-secondary hover:bg-surface hover:text-text-primary dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  aria-label={showKey ? "Hide API key" : "Show API key"}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className={helperClass}>
                {initial.hasApiKey
                  ? "Your API key is encrypted at rest with INTEGRATION_SECRETS_KEY. The plaintext is never sent back to the browser, so this field always renders empty."
                  : "Paste your SendGrid API key. It will be encrypted at rest with INTEGRATION_SECRETS_KEY before being stored."}
              </p>
            </div>

            <div>
              <label htmlFor="from_email" className={labelClass}>
                From email
              </label>
              <input
                id="from_email"
                name="from_email"
                type="email"
                autoComplete="off"
                defaultValue={initial.fromEmail}
                className={inputClass}
                placeholder="hello@yourdomain.com"
              />
              <p className={helperClass}>Must be a verified sender (single sender or domain) in SendGrid.</p>
            </div>

            <div>
              <label htmlFor="from_name" className={labelClass}>
                From name (optional)
              </label>
              <input
                id="from_name"
                name="from_name"
                type="text"
                autoComplete="off"
                defaultValue={initial.fromName}
                className={inputClass}
                placeholder="Your agency name"
              />
            </div>

            <div>
              <label htmlFor="reply_to" className={labelClass}>
                Reply-to (optional)
              </label>
              <input
                id="reply_to"
                name="reply_to"
                type="email"
                autoComplete="off"
                defaultValue={initial.replyTo}
                className={inputClass}
                placeholder="replies@inbound.yourdomain.com"
              />
              <p className={helperClass}>
                For prospect replies to show in the Conversations inbox, this should usually be an address on a
                subdomain you route through SendGrid Inbound Parse (same hostname you configure in SendGrid), not a
                personal inbox. The recipient&apos;s mail client uses this header for Reply when it is set.
              </p>
            </div>

            <div>
              <label htmlFor="test_destination_email" className={labelClass}>
                Send test email to (optional)
              </label>
              <input
                id="test_destination_email"
                name="test_destination_email"
                type="email"
                autoComplete="off"
                defaultValue={initial.testDestinationEmail}
                className={inputClass}
                placeholder="you@example.com"
              />
              <p className={helperClass}>
                If empty, Test Connection sends a short message to your From address to validate the key.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={testPending}
              onClick={() => onTest()}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text-primary shadow-sm transition-colors hover:bg-surface disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              <RefreshCw className={`h-4 w-4 ${testPending ? "animate-spin" : ""}`} aria-hidden />
              {testPending ? "Testing…" : "Test connection"}
            </button>
            <button
              type="submit"
              disabled={savePending}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {savePending ? "Saving…" : "Save & connect"}
            </button>
          </div>
        </section>

        <section className={cardClass}>
          <h2 className="text-base font-semibold text-text-primary dark:text-zinc-100">
            Inbound email (replies in Conversations)
          </h2>
          <p className="mt-2 text-sm text-text-secondary dark:text-zinc-400">
            Outbound email is only half of the thread. To ingest prospect replies into the CRM, enable{" "}
            <a
              href={SENDGRID_INBOUND_PARSE}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:underline"
            >
              SendGrid Inbound Parse
            </a>{" "}
            and point the POST URL to the webhook below. Set{" "}
            <code className="rounded bg-surface px-1 py-0.5 text-xs dark:bg-zinc-800">SENDGRID_INBOUND_WEBHOOK_SECRET</code>{" "}
            in your server environment, then use the <strong>same</strong> value in place of{" "}
            <code className="rounded bg-surface px-1 py-0.5 text-xs dark:bg-zinc-800">YOUR_SENDGRID_INBOUND_WEBHOOK_SECRET</code>{" "}
            in the query string (Vercel → Environment Variables).
          </p>
          <div className="mt-4">
            <p className={labelClass}>Webhook URL for SendGrid Inbound Parse</p>
            <div className="mt-1.5 break-all rounded-xl border border-border bg-surface/60 px-3.5 py-2.5 font-mono text-xs text-text-primary dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200">
              {inboundWebhookUrl}
            </div>
            <p className={helperClass}>
          Also configure the receiving host’s DNS (MX) as SendGrid documents. Without Inbound Parse hitting this
          app, or if replies go only to Gmail and never through your parse address, they will not appear in
          Conversations.
            </p>
          </div>
        </section>

        <section className={cardClass}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-text-primary dark:text-zinc-100">
                Inbound activity
              </h2>
              <p className="mt-2 max-w-xl text-sm text-text-secondary dark:text-zinc-400">
                Every call SendGrid Inbound Parse makes to this app is recorded here, including
                token mismatches and parse errors. If this list is empty after you reply to a
                preview email, replies are not reaching SendGrid (DNS/MX or Inbound Parse hostname
                are wrong).
              </p>
            </div>
            <button
              type="button"
              onClick={onRunDiagnostic}
              disabled={diagnosticPending}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text-primary shadow-sm transition-colors hover:bg-surface disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              <Zap
                className={`h-4 w-4 ${diagnosticPending ? "animate-pulse" : ""}`}
                aria-hidden
              />
              {diagnosticPending ? "Running…" : "Run inbound diagnostic"}
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {!inboundSecretConfigured ? (
              <div
                className="flex gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
                role="alert"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  <code className="rounded bg-red-100 px-1 py-0.5 text-xs dark:bg-red-900/60">
                    SENDGRID_INBOUND_WEBHOOK_SECRET
                  </code>{" "}
                  is not set on the server. Add it on Vercel → Environment Variables, then redeploy.
                  Until you do, every Inbound Parse call will be rejected with 401.
                </span>
              </div>
            ) : null}
            {showMxMismatchBanner && replyToMx ? (
              <div
                className="flex gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
                role="alert"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  Reply-to{" "}
                  <code className="rounded bg-red-100 px-1 py-0.5 text-xs dark:bg-red-900/60">
                    {replyToTrim}
                  </code>{" "}
                  will bounce.{" "}
                  {replyToMx.sendgridIsBackupOnly ? (
                    <>
                      MX for{" "}
                      <code className="rounded bg-red-100 px-1 py-0.5 text-xs dark:bg-red-900/60">
                        {replyToMx.replyToDomain}
                      </code>{" "}
                      lists SendGrid, but the most-preferred host is{" "}
                      <code className="rounded bg-red-100 px-1 py-0.5 text-xs dark:bg-red-900/60">
                        {replyToMx.topMx ?? "(none)"}
                      </code>
                      . SMTP senders try the lowest-priority record first and do not fall back on
                      a 5xx reject, so SendGrid never sees the message.
                    </>
                  ) : (
                    <>
                      MX for{" "}
                      <code className="rounded bg-red-100 px-1 py-0.5 text-xs dark:bg-red-900/60">
                        {replyToMx.replyToDomain}
                      </code>{" "}
                      resolves to{" "}
                      <code className="rounded bg-red-100 px-1 py-0.5 text-xs dark:bg-red-900/60">
                        {replyToMx.topMx ?? "(none)"}
                      </code>
                      , not an{" "}
                      <code className="rounded bg-red-100 px-1 py-0.5 text-xs dark:bg-red-900/60">
                        mx.sendgrid.net
                      </code>{" "}
                      host.
                    </>
                  )}{" "}
                  Use a dedicated subdomain whose only MX is SendGrid (e.g.{" "}
                  <code className="rounded bg-red-100 px-1 py-0.5 text-xs dark:bg-red-900/60">
                    replies@inbound.{rootDomainOf(replyToMx.replyToDomain)}
                  </code>
                  ) and update Reply-to to that address.
                </span>
              </div>
            ) : null}
            {showMxUnresolvedBanner && replyToMx ? (
              <div
                className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
                role="status"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  Could not resolve MX for{" "}
                  <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900/60">
                    {replyToMx.replyToDomain}
                  </code>
                  {replyToMx.error ? <> ({replyToMx.error})</> : null}. Inbound replies will not
                  reach the CRM until this domain has a SendGrid Inbound Parse MX.
                </span>
              </div>
            ) : null}
            {showMissingReplyToWarning ? (
              <div
                className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
                role="status"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  No <strong>Reply-to</strong> is set, so replies will go to{" "}
                  <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900/60">
                    {fromEmailDomain}
                  </code>
                  . That hostname must have its MX record routed through SendGrid Inbound Parse, or
                  replies will land in a personal mailbox and never reach Conversations.
                </span>
              </div>
            ) : null}
          </div>

          {diagnostic.kind === "done" ? (
            <div
              className={`mt-4 flex gap-3 rounded-xl border px-4 py-3 text-sm ${
                diagnostic.ok
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
                  : "border-red-300 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
              }`}
              role={diagnostic.ok ? "status" : "alert"}
            >
              {diagnostic.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              )}
              <span>
                {diagnostic.message}
                {diagnostic.conversationHref ? (
                  <>
                    {" "}
                    <Link
                      href={diagnostic.conversationHref}
                      className="font-semibold underline-offset-2 hover:underline"
                    >
                      Open the conversation
                    </Link>
                    .
                  </>
                ) : null}
              </span>
            </div>
          ) : null}

          <div className="mt-5 overflow-hidden rounded-xl border border-border dark:border-zinc-800">
            {inboundActivity.length === 0 ? (
              <p className="px-4 py-6 text-sm text-text-secondary dark:text-zinc-400">
                No inbound webhook calls yet. If you sent yourself a reply and this list is still
                empty, MX routing or the Inbound Parse hostname are wrong — replies are not reaching
                SendGrid. Click{" "}
                <span className="font-semibold">Run inbound diagnostic</span> above to verify the
                webhook is reachable from the app.
              </p>
            ) : (
              <table className="w-full table-fixed text-left text-sm">
                <thead className="bg-surface/60 text-xs uppercase tracking-wide text-text-secondary dark:bg-zinc-900/60 dark:text-zinc-400">
                  <tr>
                    <th className="w-32 px-3 py-2 font-medium">When</th>
                    <th className="w-32 px-3 py-2 font-medium">Status</th>
                    <th className="w-48 px-3 py-2 font-medium">From</th>
                    <th className="px-3 py-2 font-medium">Subject</th>
                    <th className="w-40 px-3 py-2 font-medium">Conversation</th>
                  </tr>
                </thead>
                <tbody>
                  {inboundActivity.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-border/60 align-top dark:border-zinc-800"
                    >
                      <td className="px-3 py-2 text-xs text-text-secondary dark:text-zinc-400">
                        <time
                          dateTime={row.createdAt}
                          title={new Date(row.createdAt).toLocaleString()}
                        >
                          {formatRelative(row.createdAt)}
                        </time>
                      </td>
                      <td className="px-3 py-2">
                        <StatusPill status={row.status} />
                        {row.errorMessage ? (
                          <p className="mt-1 break-words text-xs text-text-secondary dark:text-zinc-500">
                            {row.errorMessage}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 break-words text-text-primary dark:text-zinc-200">
                        {row.fromEmail ?? <span className="text-text-secondary">—</span>}
                      </td>
                      <td className="px-3 py-2 break-words text-text-primary dark:text-zinc-200">
                        {row.subject ?? <span className="text-text-secondary">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        {row.conversationHref ? (
                          <Link
                            href={row.conversationHref}
                            className="inline-flex items-center gap-1 text-accent hover:underline"
                          >
                            Open
                            <ExternalLink className="h-3 w-3" aria-hidden />
                          </Link>
                        ) : (
                          <span className="text-text-secondary">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className={cardClass}>
          <h2 className="text-base font-semibold text-text-primary dark:text-zinc-100">
            What SendGrid enables
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              {
                Icon: Send,
                title: "Prospect preview email",
                body: "Send hosted Stitch preview links from Prospecting with your templates and optional screenshot.",
              },
              {
                Icon: Mail,
                title: "Transactional sends",
                body: "Agency-controlled API key and verified sender — no extra deploy env for basic CRM email.",
              },
            ].map(({ Icon, title, body }) => (
              <div
                key={title}
                className="rounded-xl border border-border/80 bg-surface/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-400">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-text-primary dark:text-zinc-100">{title}</h3>
                <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </form>

      <section className={`${cardClass} mt-8`}>
        <h2 className="text-base font-semibold text-text-primary dark:text-zinc-100">Resend fallback</h2>
        <p className="mt-2 text-sm text-text-secondary dark:text-zinc-400">
          If SendGrid is not saved in the CRM, prospect emails still use{" "}
          <span className="font-mono text-xs">RESEND_API_KEY</span> and{" "}
          <span className="font-mono text-xs">RESEND_FROM_EMAIL</span> from the server environment when set. Configure
          SendGrid here to prefer it over Resend.           Replies to those Resend messages are not imported into this app’s Conversations; use SendGrid and Inbound
          Parse above for a two-way email thread in the CRM.
        </p>
      </section>
    </div>
  );
}

const STATUS_PILL_STYLES: Record<SendGridInboundLogStatus, string> = {
  threaded:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  new_conversation:
    "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
  diagnostic:
    "bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200",
  unauthorized:
    "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  invalid_payload:
    "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  error: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200",
};

const STATUS_PILL_LABELS: Record<SendGridInboundLogStatus, string> = {
  threaded: "Threaded",
  new_conversation: "New conversation",
  diagnostic: "Diagnostic",
  unauthorized: "Unauthorized",
  invalid_payload: "Invalid payload",
  error: "Error",
};

function StatusPill({ status }: { status: SendGridInboundLogStatus }) {
  const cls = STATUS_PILL_STYLES[status] ?? STATUS_PILL_STYLES.error;
  const label = STATUS_PILL_LABELS[status] ?? status;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

/**
 * Best-effort registrable domain for the suggested `inbound.<root>` example.
 * Strips the leftmost label only when there are 3+ labels so `zenphocorp.com`
 * stays `zenphocorp.com` but `mail.zenphocorp.com` collapses to `zenphocorp.com`.
 */
function rootDomainOf(domain: string): string {
  const parts = domain.split(".");
  if (parts.length <= 2) return domain;
  return parts.slice(-2).join(".");
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diffMs = Date.now() - then;
  const seconds = Math.round(diffMs / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
