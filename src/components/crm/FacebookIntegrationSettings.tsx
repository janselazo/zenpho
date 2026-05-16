"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Facebook,
  RefreshCw,
  Shield,
  Trash2,
} from "lucide-react";
import {
  addFacebookPage,
  removeFacebookPage,
  rotateFacebookSecrets,
  saveFacebookIntegration,
  testFacebookPage,
  type FacebookConnectedPageRow,
  type FacebookEventLogRow,
  type FacebookIntegrationFormState,
  type FacebookOwnerOption,
} from "@/app/(crm)/actions/facebook-integration";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[box-shadow,border-color] placeholder:text-text-secondary/45 focus:border-accent focus:ring-2 focus:ring-accent/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500";

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-primary dark:text-zinc-200";

const helperClass = "mt-1 text-xs text-text-secondary dark:text-zinc-400";

const cardClass =
  "rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80 sm:p-8";

const META_DEVELOPER_DOCS =
  "https://developers.facebook.com/docs/marketing-api/guides/lead-ads/setup";
const META_WEBHOOKS_DOCS =
  "https://developers.facebook.com/docs/graph-api/webhooks/getting-started";
const META_LEAD_TESTER =
  "https://developers.facebook.com/tools/lead-ads-testing";

type Props = {
  initial: FacebookIntegrationFormState;
  pages: FacebookConnectedPageRow[];
  owners: FacebookOwnerOption[];
  webhookUrl: string;
  events: FacebookEventLogRow[];
  integrationKeyConfigured: boolean;
};

export default function FacebookIntegrationSettings({
  initial,
  pages,
  owners,
  webhookUrl,
  events,
  integrationKeyConfigured,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [showWebhook, setShowWebhook] = useState(true);
  const [savePending, startSave] = useTransition();
  const [rotatePending, startRotate] = useTransition();
  const [pagePending, startPage] = useTransition();
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function copy(value: string) {
    if (!value) return;
    navigator.clipboard?.writeText(value).catch(() => {
      // Browser blocked clipboard write; fall back silently.
    });
  }

  function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const fd = new FormData(e.currentTarget);
    startSave(async () => {
      const res = await saveFacebookIntegration(fd);
      if ("error" in res && res.error) {
        setError(res.error);
      } else {
        setMessage("Saved. Webhook URL and verify token are ready for Meta.");
        const secretInput = formRef.current?.elements.namedItem("app_secret");
        if (secretInput instanceof HTMLInputElement) secretInput.value = "";
        router.refresh();
      }
    });
  }

  function onRotate() {
    setMessage(null);
    setError(null);
    startRotate(async () => {
      const res = await rotateFacebookSecrets();
      if ("error" in res && res.error) {
        setError(res.error);
      } else {
        setMessage(
          "Rotated webhook secret + verify token. Update them in the Meta App dashboard."
        );
        router.refresh();
      }
    });
  }

  return (
    <div className="mx-auto max-w-4xl">
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
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm"
            aria-hidden
          >
            <Facebook className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="heading-display text-2xl font-bold tracking-tight text-text-primary dark:text-zinc-100 sm:text-3xl">
              Facebook Lead Ads
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary dark:text-zinc-400">
              Capture leads from Facebook Lead Ads campaigns directly into your CRM
              and notify your team via email + SMS in real time.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 h-px w-full bg-accent/40" aria-hidden />

      {!integrationKeyConfigured ? (
        <div
          className="mt-6 flex gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            <code className="rounded bg-red-100 px-1 py-0.5 text-xs dark:bg-red-900/60">
              INTEGRATION_SECRETS_KEY
            </code>{" "}
            is not set on the server. Add it to .env.local (and Vercel
            Environment Variables for production) before saving the App secret
            or Page tokens.
          </span>
        </div>
      ) : null}

      {error ? (
        <p
          className="mt-6 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-6 text-sm text-emerald-700 dark:text-emerald-400">
          {message}
        </p>
      ) : null}

      <form ref={formRef} onSubmit={handleSave} className="mt-8 space-y-8">
        <section className={cardClass}>
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              <Shield className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary dark:text-zinc-100">
                Meta App credentials
              </h2>
              <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
                Paste the App ID + App Secret from your Meta App, then add the
                webhook URL and verify token to the App dashboard. See the{" "}
                <a
                  href={META_DEVELOPER_DOCS}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-accent hover:underline"
                >
                  Meta Lead Ads setup guide
                </a>{" "}
                and{" "}
                <a
                  href={META_WEBHOOKS_DOCS}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-accent hover:underline"
                >
                  Webhooks getting started
                </a>
                .
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="app_id" className={labelClass}>
                App ID
              </label>
              <input
                id="app_id"
                name="app_id"
                type="text"
                autoComplete="off"
                defaultValue={initial.appId}
                className={inputClass}
                placeholder="e.g. 1234567890"
              />
              <p className={helperClass}>
                Find under Meta App → App Settings → Basic.
              </p>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor="app_secret" className={`${labelClass} mb-0`}>
                  App Secret
                </label>
                {initial.hasAppSecret ? (
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
                  id="app_secret"
                  name="app_secret"
                  type={showSecret ? "text" : "password"}
                  autoComplete="new-password"
                  className={`${inputClass} pr-12`}
                  placeholder={
                    initial.hasAppSecret
                      ? "Leave blank to keep saved secret, or paste a new one"
                      : "Paste your Meta App Secret"
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-text-secondary hover:bg-surface hover:text-text-primary dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  aria-label={showSecret ? "Hide" : "Show"}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className={helperClass}>
                Used to verify the X-Hub-Signature-256 on every webhook call.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="default_lead_owner_id" className={labelClass}>
                Default lead owner
              </label>
              <select
                id="default_lead_owner_id"
                name="default_lead_owner_id"
                defaultValue={initial.defaultLeadOwnerId ?? ""}
                className={inputClass}
              >
                <option value="">Unassigned (notify Admins)</option>
                {owners.map((o) => (
                  <option key={o.userId} value={o.userId}>
                    {o.fullName ?? o.email ?? o.userId}
                    {o.role ? ` • ${o.role}` : ""}
                  </option>
                ))}
              </select>
              <p className={helperClass}>
                Assigned to every new Facebook lead unless a per-form override is
                set.
              </p>
            </div>

            <div>
              <label htmlFor="default_lead_source" className={labelClass}>
                Default lead source label
              </label>
              <input
                id="default_lead_source"
                name="default_lead_source"
                type="text"
                defaultValue={initial.defaultLeadSource}
                className={inputClass}
                placeholder="Facebook Lead Ads"
              />
              <p className={helperClass}>
                Stored on the lead row and shown in pickers.
              </p>
            </div>
          </div>

          <label className="mt-6 flex items-center gap-2 text-sm text-text-primary dark:text-zinc-100">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={initial.isActive}
              className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
            />
            Active — accept incoming leadgen webhooks for this organization.
          </label>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={savePending}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {savePending ? "Saving…" : "Save credentials"}
            </button>
            <button
              type="button"
              onClick={onRotate}
              disabled={rotatePending}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text-primary shadow-sm transition-colors hover:bg-surface disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              <RefreshCw className={`h-4 w-4 ${rotatePending ? "animate-spin" : ""}`} aria-hidden />
              {rotatePending ? "Rotating…" : "Rotate webhook secret + verify token"}
            </button>
          </div>
        </section>

        <section className={cardClass}>
          <h2 className="text-base font-semibold text-text-primary dark:text-zinc-100">
            Webhook configuration for Meta
          </h2>
          <p className="mt-2 text-sm text-text-secondary dark:text-zinc-400">
            In the Meta App dashboard add a Webhooks product, choose
            <strong> Page</strong>, paste the values below, and subscribe to the{" "}
            <code className="rounded bg-surface px-1 py-0.5 text-xs dark:bg-zinc-800">
              leadgen
            </code>{" "}
            field. Then, on each connected Page below, click{" "}
            <strong>Subscribe</strong> in the Webhooks product to bind your App
            to that Page.
          </p>

          <div className="mt-5 space-y-4">
            <CopyableField
              label="Callback URL"
              value={webhookUrl}
              show={showWebhook}
              setShow={setShowWebhook}
              onCopy={() => copy(webhookUrl)}
            />
            <CopyableField
              label="Verify token"
              value={initial.verifyToken}
              show={showVerify}
              setShow={setShowVerify}
              onCopy={() => copy(initial.verifyToken)}
            />
          </div>

          <p className={`${helperClass} mt-5`}>
            Use the{" "}
            <a
              href={META_LEAD_TESTER}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:underline"
            >
              Meta Lead Ads Testing Tool
            </a>{" "}
            to send a synthetic lead and verify the integration end-to-end.
          </p>
        </section>
      </form>

      <section className={`${cardClass} mt-8`}>
        <h2 className="text-base font-semibold text-text-primary dark:text-zinc-100">
          Connected Facebook Pages
        </h2>
        <p className="mt-2 text-sm text-text-secondary dark:text-zinc-400">
          Add every Page that runs Lead Ads campaigns. Use a long-lived Page
          access token (System User token recommended) so leads keep flowing
          without re-auth.
        </p>

        {pageError ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {pageError}
          </p>
        ) : null}
        {pageMessage ? (
          <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">
            {pageMessage}
          </p>
        ) : null}

        <div className="mt-6 space-y-3">
          {pages.length === 0 ? (
            <p className="text-sm text-text-secondary dark:text-zinc-400">
              No Pages connected yet. Add at least one below.
            </p>
          ) : (
            pages.map((p) => (
              <PageRow
                key={p.id}
                row={p}
                onChange={() => router.refresh()}
                setPagePending={(fn) => startPage(fn)}
                pagePending={pagePending}
                setMessage={setPageMessage}
                setError={setPageError}
              />
            ))
          )}
        </div>

        <PageAddForm
          onAdded={() => router.refresh()}
          setPagePending={(fn) => startPage(fn)}
          pagePending={pagePending}
          setMessage={setPageMessage}
          setError={setPageError}
          disabled={!integrationKeyConfigured}
        />
      </section>

      <section className={`${cardClass} mt-8`}>
        <h2 className="text-base font-semibold text-text-primary dark:text-zinc-100">
          Webhook activity
        </h2>
        <p className="mt-2 text-sm text-text-secondary dark:text-zinc-400">
          Last {events.length} events received from Meta. Use this to debug
          missed leads, signature failures, or unknown Pages.
        </p>

        <div className="mt-5 overflow-hidden rounded-xl border border-border dark:border-zinc-800">
          {events.length === 0 ? (
            <p className="px-4 py-6 text-sm text-text-secondary dark:text-zinc-400">
              No webhook calls yet. After connecting a Page in the Meta App
              dashboard, send a test lead from the Lead Ads Testing Tool linked
              above to confirm delivery.
            </p>
          ) : (
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-surface/60 text-xs uppercase tracking-wide text-text-secondary dark:bg-zinc-900/60 dark:text-zinc-400">
                <tr>
                  <th className="w-32 px-3 py-2 font-medium">When</th>
                  <th className="w-40 px-3 py-2 font-medium">Status</th>
                  <th className="w-40 px-3 py-2 font-medium">Page</th>
                  <th className="w-40 px-3 py-2 font-medium">Form</th>
                  <th className="px-3 py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {events.map((row) => (
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
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-text-primary dark:text-zinc-200">
                      {row.pageId ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-text-primary dark:text-zinc-200">
                      {row.formId ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-text-primary dark:text-zinc-200">
                      {row.leadId ? (
                        <Link
                          href={`/leads/${row.leadId}`}
                          className="font-medium text-accent hover:underline"
                        >
                          Open lead
                        </Link>
                      ) : null}
                      {row.errorMessage ? (
                        <p className="mt-1 break-words text-xs text-text-secondary dark:text-zinc-500">
                          {row.errorMessage}
                        </p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function CopyableField({
  label,
  value,
  show,
  setShow,
  onCopy,
}: {
  label: string;
  value: string;
  show: boolean;
  setShow: (v: boolean) => void;
  onCopy: () => void;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(t);
  }, [copied]);

  return (
    <div>
      <p className={labelClass}>{label}</p>
      <div className="flex items-stretch gap-2">
        <code className="flex-1 break-all rounded-xl border border-border bg-surface/60 px-3.5 py-2.5 font-mono text-xs text-text-primary dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200">
          {value ? (show ? value : value.replace(/./g, "•")) : "(not configured)"}
        </code>
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-3 text-text-primary shadow-sm transition-colors hover:bg-surface dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          aria-label={show ? "Hide" : "Show"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={() => {
            onCopy();
            setCopied(true);
          }}
          disabled={!value}
          className="inline-flex items-center justify-center gap-1 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-text-primary shadow-sm transition-colors hover:bg-surface disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function PageRow({
  row,
  onChange,
  setPagePending,
  pagePending,
  setMessage,
  setError,
}: {
  row: FacebookConnectedPageRow;
  onChange: () => void;
  setPagePending: (fn: () => void) => void;
  pagePending: boolean;
  setMessage: (msg: string | null) => void;
  setError: (msg: string | null) => void;
}) {
  function onTest() {
    setMessage(null);
    setError(null);
    setPagePending(async () => {
      const fd = new FormData();
      fd.set("id", row.id);
      const res = await testFacebookPage(fd);
      if ("error" in res && res.error) setError(res.error);
      else if ("message" in res && res.message) setMessage(res.message);
      onChange();
    });
  }

  function onRemove() {
    if (
      !window.confirm(
        `Disconnect Page ${row.pageName ?? row.pageId}? This stops new leads from arriving for this Page.`
      )
    )
      return;
    setMessage(null);
    setError(null);
    setPagePending(async () => {
      const fd = new FormData();
      fd.set("id", row.id);
      const res = await removeFacebookPage(fd);
      if ("error" in res && res.error) setError(res.error);
      else setMessage("Page disconnected.");
      onChange();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface/40 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary dark:text-zinc-100">
          {row.pageName ?? row.pageId}
        </p>
        <p className="font-mono text-xs text-text-secondary dark:text-zinc-400">
          page_id={row.pageId}
        </p>
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          row.hasAccessToken
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
            : "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
        }`}
      >
        {row.hasAccessToken ? "Token saved" : "No token"}
      </span>
      <button
        type="button"
        onClick={onTest}
        disabled={pagePending || !row.hasAccessToken}
        className="rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text-primary shadow-sm transition-colors hover:bg-surface disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        Test connection
      </button>
      <button
        type="button"
        onClick={onRemove}
        disabled={pagePending}
        className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900/60 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/40"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        Remove
      </button>
    </div>
  );
}

function PageAddForm({
  onAdded,
  setPagePending,
  pagePending,
  setMessage,
  setError,
  disabled,
}: {
  onAdded: () => void;
  setPagePending: (fn: () => void) => void;
  pagePending: boolean;
  setMessage: (msg: string | null) => void;
  setError: (msg: string | null) => void;
  disabled: boolean;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [showToken, setShowToken] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const fd = new FormData(e.currentTarget);
    setPagePending(async () => {
      const res = await addFacebookPage(fd);
      if ("error" in res && res.error) setError(res.error);
      else {
        setMessage("Page connected.");
        ref.current?.reset();
      }
      onAdded();
    });
  }

  return (
    <form
      ref={ref}
      onSubmit={onSubmit}
      className="mt-6 grid gap-4 rounded-xl border border-dashed border-border bg-surface/30 p-4 dark:border-zinc-700 dark:bg-zinc-900/40 sm:grid-cols-2"
    >
      <div>
        <label htmlFor="page_id" className={labelClass}>
          Page ID
        </label>
        <input
          id="page_id"
          name="page_id"
          type="text"
          required
          className={inputClass}
          placeholder="e.g. 102030405060708"
        />
        <p className={helperClass}>
          Find on the Page → About → Page transparency.
        </p>
      </div>
      <div>
        <label htmlFor="page_name" className={labelClass}>
          Page name (optional)
        </label>
        <input
          id="page_name"
          name="page_name"
          type="text"
          className={inputClass}
          placeholder="Will be auto-filled by Test connection"
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="page_access_token" className={labelClass}>
          Page access token
        </label>
        <div className="relative">
          <input
            id="page_access_token"
            name="page_access_token"
            type={showToken ? "text" : "password"}
            required
            className={`${inputClass} pr-12`}
            placeholder="Paste a long-lived Page access token"
          />
          <button
            type="button"
            onClick={() => setShowToken((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-text-secondary hover:bg-surface hover:text-text-primary dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label={showToken ? "Hide" : "Show"}
          >
            {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className={helperClass}>
          Stored encrypted; never sent back to the browser.
        </p>
      </div>
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pagePending || disabled}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {pagePending ? "Connecting…" : "Connect Page"}
        </button>
      </div>
    </form>
  );
}

const STATUS_PILL_STYLES: Record<string, string> = {
  processed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  duplicate:
    "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
  received:
    "bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200",
  unauthorized:
    "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  invalid_signature:
    "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  unknown_page:
    "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  graph_error:
    "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200",
  error: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200",
};

function StatusPill({ status }: { status: string }) {
  const cls = STATUS_PILL_STYLES[status] ?? STATUS_PILL_STYLES.error;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}
    >
      {status}
    </span>
  );
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
