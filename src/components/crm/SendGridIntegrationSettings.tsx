"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type FormEvent } from "react";
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  EyeOff,
  Mail,
  RefreshCw,
  Send,
  Shield,
} from "lucide-react";
import {
  saveSendGridIntegration,
  testSendGridConnection,
  type SendGridIntegrationFormState,
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

type Props = {
  initial: SendGridIntegrationFormState;
};

export default function SendGridIntegrationSettings({ initial }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [showKey, setShowKey] = useState(false);
  const [savePending, startSave] = useTransition();
  const [testPending, startTest] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const formData = new FormData(e.currentTarget);
    startSave(async () => {
      const res = await saveSendGridIntegration(formData);
      if ("error" in res && res.error) setError(res.error);
      else setMessage("Settings saved.");
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
              <label htmlFor="api_key" className={labelClass}>
                API key
              </label>
              <div className="relative">
                <input
                  id="api_key"
                  name="api_key"
                  type={showKey ? "text" : "password"}
                  autoComplete="new-password"
                  className={`${inputClass} pr-12`}
                  placeholder="SG.xxxxxxxxxxxx"
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
              {initial.hasApiKey ? (
                <p className={helperClass}>Leave blank to keep your existing API key.</p>
              ) : null}
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
                placeholder="replies@yourdomain.com"
              />
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
          SendGrid here to prefer it over Resend.
        </p>
      </section>
    </div>
  );
}
