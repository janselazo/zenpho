"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type FormEvent } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Inbox,
  Info,
  MessageCircle,
  MessageSquare,
  Plug,
  RefreshCw,
  Send,
  Shield,
  Zap,
} from "lucide-react";
import {
  saveTwilioIntegration,
  syncTwilioSmsWebhook,
  testTwilioConnection,
  type TwilioIntegrationFormState,
} from "@/app/(crm)/actions/twilio-integration";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[box-shadow,border-color] placeholder:text-text-secondary/45 focus:border-accent focus:ring-2 focus:ring-accent/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500";

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-primary dark:text-zinc-200";

const helperClass = "mt-1 text-xs text-text-secondary dark:text-zinc-400";

const cardClass =
  "rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80 sm:p-8";

const TWILIO_CONSOLE = "https://console.twilio.com/";
const TWILIO_WHATSAPP_SENDER = "https://www.twilio.com/docs/whatsapp";
const TWILIO_PHONE_DOCS =
  "https://www.twilio.com/docs/phone-numbers/incoming-phone-numbers";

type Props = {
  initial: TwilioIntegrationFormState;
  webhookOrigin: string;
};

export default function TwilioIntegrationSettings({ initial, webhookOrigin }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [showToken, setShowToken] = useState(false);
  const [whatsappSandbox, setWhatsappSandbox] = useState(initial.whatsappSandbox);
  const [savePending, startSave] = useTransition();
  const [testPending, startTest] = useTransition();
  const [syncPending, startSync] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const smsWebhookUrl = `${webhookOrigin}/api/webhooks/twilio`;
  const whatsappWebhookUrl = `${webhookOrigin}/api/webhooks/whatsapp`;

  async function copyUrl(key: string, url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("whatsapp_sandbox", whatsappSandbox ? "true" : "false");
    startSave(async () => {
      const res = await saveTwilioIntegration(formData);
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
    fd.set("whatsapp_sandbox", whatsappSandbox ? "true" : "false");
    startTest(async () => {
      const res = await testTwilioConnection(fd);
      if ("error" in res && res.error) setError(res.error);
      else if ("message" in res && res.message) setMessage(res.message);
      else setMessage("Connection OK.");
    });
  }

  function onSyncSmsWebhook() {
    setMessage(null);
    setError(null);
    startSync(async () => {
      const res = await syncTwilioSmsWebhook();
      if ("error" in res && res.error) setError(res.error);
      else if ("message" in res && res.message) setMessage(res.message);
      else setMessage("SMS replies are now routed to Conversations.");
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
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white shadow-sm"
            aria-hidden
          >
            <MessageSquare className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="heading-display text-2xl font-bold tracking-tight text-text-primary dark:text-zinc-100 sm:text-3xl">
              Twilio SMS &amp; WhatsApp
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary dark:text-zinc-400">
              Two-way SMS &amp; WhatsApp messaging, automated campaigns, and inbound lead capture
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
        <input type="hidden" name="whatsapp_sandbox" value={whatsappSandbox ? "true" : "false"} />

        {/* Credentials */}
        <section className={cardClass}>
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
              <Shield className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary dark:text-zinc-100">
                Twilio Credentials
              </h2>
              <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
                Enter your Twilio Account SID and Auth Token. Find them in your{" "}
                <a
                  href={TWILIO_CONSOLE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                >
                  Twilio Console
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
                .
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-5">
            <div>
              <label htmlFor="account_sid" className={labelClass}>
                Account SID
              </label>
              <input
                id="account_sid"
                name="account_sid"
                type="text"
                autoComplete="off"
                defaultValue={initial.accountSid}
                className={inputClass}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>

            <div>
              <label htmlFor="auth_token" className={labelClass}>
                Auth Token
              </label>
              <div className="relative">
                <input
                  id="auth_token"
                  name="auth_token"
                  type={showToken ? "text" : "password"}
                  autoComplete="new-password"
                  className={`${inputClass} pr-12`}
                  placeholder="Your Twilio Auth Token"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-text-secondary hover:bg-surface hover:text-text-primary dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  aria-label={showToken ? "Hide auth token" : "Show auth token"}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {initial.hasAuthToken ? (
                <p className={helperClass}>Leave blank to keep your existing token.</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="from_phone" className={labelClass}>
                Twilio Phone Number (recommended)
              </label>
              <input
                id="from_phone"
                name="from_phone"
                type="tel"
                defaultValue={initial.fromPhone}
                className={inputClass}
                placeholder="+13055551234"
              />
              <p className={helperClass}>
                The SMS-enabled number you purchased in Twilio. We&apos;ll use it for outbound messages
                and test SMS.
              </p>
            </div>

            <div>
              <label htmlFor="test_destination_phone" className={labelClass}>
                Send Test SMS To (optional)
              </label>
              <input
                id="test_destination_phone"
                name="test_destination_phone"
                type="tel"
                defaultValue={initial.testDestinationPhone}
                className={inputClass}
                placeholder="+13055559999"
              />
              <p className={helperClass}>
                If provided with a verified From number, we&apos;ll send a test message when you run Test
                Connection.
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
              {testPending ? "Testing…" : "Test Connection"}
            </button>
            <button
              type="submit"
              disabled={savePending}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {savePending ? "Saving…" : "Save & Connect"}
            </button>
          </div>
        </section>

        {/* Features (static, inside form for layout only) */}
        <section className={cardClass}>
          <h2 className="text-base font-semibold text-text-primary dark:text-zinc-100">
            What does Twilio SMS enable?
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              {
                Icon: Send,
                title: "Outbound SMS",
                body: "Send texts to leads directly from the CRM with personalized templates.",
              },
              {
                Icon: Inbox,
                title: "Inbound Capture",
                body: "Auto-capture replies and create leads from inbound texts.",
              },
              {
                Icon: Zap,
                title: "SMS Automation",
                body: "Drip campaigns, appointment reminders, and follow-up sequences.",
              },
              {
                Icon: MessageCircle,
                title: "Two-Way Conversations",
                body: "Full conversation threads with each lead in one inbox.",
              },
            ].map(({ Icon, title, body }) => (
              <div
                key={title}
                className="rounded-xl border border-border/80 bg-surface/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-text-primary dark:text-zinc-100">{title}</h3>
                <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* WhatsApp */}
        <section className={cardClass}>
          <div className="flex flex-wrap items-center gap-2 gap-y-1">
            <h2 className="text-base font-semibold text-text-primary dark:text-zinc-100">
              <span className="mr-1.5" aria-hidden>
                💬
              </span>
              WhatsApp Configuration
            </h2>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              Optional
            </span>
          </div>
          <p className="mt-2 text-sm text-text-secondary dark:text-zinc-400">
            Enable WhatsApp messaging using the same Twilio account. Requires a{" "}
            <a
              href={TWILIO_WHATSAPP_SENDER}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
            >
              WhatsApp-enabled sender
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
            .
          </p>

          <div className="mt-6 flex flex-col gap-4 border-t border-border/70 pt-6 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-text-primary dark:text-zinc-100">Sandbox Mode</p>
              <p className="mt-0.5 text-sm text-text-secondary dark:text-zinc-400">
                Use the Twilio WhatsApp Sandbox for testing.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={whatsappSandbox}
              onClick={() => setWhatsappSandbox((v) => !v)}
              className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
                whatsappSandbox ? "bg-accent" : "bg-zinc-300 dark:bg-zinc-600"
              }`}
            >
              <span
                className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  whatsappSandbox ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="mt-6">
            <label htmlFor="whatsapp_from" className={labelClass}>
              WhatsApp Number
            </label>
            <input
              id="whatsapp_from"
              name="whatsapp_from"
              defaultValue={initial.whatsappFrom}
              className={inputClass}
              placeholder="+13055551234"
            />
            <p className={helperClass}>
              Your WhatsApp Business-enabled Twilio number. Must be registered with WhatsApp via Twilio.
            </p>
          </div>

          <div className="mt-6 flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
            <Info className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
            <p className="text-sm text-amber-950/90 dark:text-amber-100/90">
              <strong className="font-semibold">WhatsApp 24-hour session window:</strong> Outside an active
              user session, you must use pre-approved template messages. Plan your automations accordingly.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 border-t border-border/70 pt-6 dark:border-zinc-800">
            <button
              type="submit"
              disabled={savePending}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {savePending ? "Saving…" : "Save settings"}
            </button>
          </div>
        </section>
      </form>

      {/* Webhooks */}
      <section className={`${cardClass} mt-8`}>
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            <Plug className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary dark:text-zinc-100">
              Webhook Configuration
            </h2>
            <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
              Configure these webhook URLs in your Twilio settings to receive inbound messages.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
              SMS Webhook URL
            </p>
            <div className="mt-1.5 flex gap-2">
              <code className="block min-w-0 flex-1 break-all rounded-xl border border-border bg-surface/80 px-3 py-2.5 text-xs text-text-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                {smsWebhookUrl}
              </code>
              <button
                type="button"
                onClick={() => copyUrl("sms", smsWebhookUrl)}
                className="shrink-0 rounded-xl border border-border bg-white px-3 py-2 text-text-primary shadow-sm hover:bg-surface dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                aria-label="Copy SMS webhook URL"
              >
                {copiedKey === "sms" ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={syncPending}
                onClick={() => onSyncSmsWebhook()}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-60"
              >
                <Inbox className={`h-4 w-4 ${syncPending ? "animate-pulse" : ""}`} aria-hidden />
                {syncPending ? "Syncing SMS replies..." : "Sync SMS replies"}
              </button>
              <p className="max-w-xl text-xs leading-relaxed text-text-secondary dark:text-zinc-400">
                If replies show Twilio&apos;s default &quot;Configure your number&apos;s SMS URL&quot; message, sync this
                webhook so inbound SMS replies appear in Conversations.
              </p>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
              WhatsApp Webhook URL
            </p>
            <div className="mt-1.5 flex gap-2">
              <code className="block min-w-0 flex-1 break-all rounded-xl border border-border bg-surface/80 px-3 py-2.5 text-xs text-text-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                {whatsappWebhookUrl}
              </code>
              <button
                type="button"
                onClick={() => copyUrl("wa", whatsappWebhookUrl)}
                className="shrink-0 rounded-xl border border-border bg-white px-3 py-2 text-text-primary shadow-sm hover:bg-surface dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                aria-label="Copy WhatsApp webhook URL"
              >
                {copiedKey === "wa" ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-6 text-sm leading-relaxed text-text-secondary dark:text-zinc-400">
          Set the SMS webhook as the &quot;A Message Comes In&quot; URL in your{" "}
          <a
            href={TWILIO_PHONE_DOCS}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent hover:underline"
          >
            Twilio phone number config
          </a>
          , and the WhatsApp webhook in your{" "}
          <a
            href={TWILIO_WHATSAPP_SENDER}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent hover:underline"
          >
            WhatsApp sandbox/sender settings
          </a>
          . Replace the host with your deployed domain if it differs from what is shown above (
          <code className="rounded bg-surface px-1 py-0.5 text-xs dark:bg-zinc-800">PUBLIC_APP_URL</code>{" "}
          can pin this in production).
        </p>
      </section>
    </div>
  );
}
