"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { ArrowLeft, Mail, MessageSquare, Workflow } from "lucide-react";
import {
  saveMyLeadAlertOverrides,
  saveNewLeadAlertEnabled,
  saveNewLeadAlertTemplate,
  type NewLeadAlertPreference,
  type NewLeadAlertTemplate,
} from "@/app/(crm)/actions/lead-automation";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-[box-shadow,border-color] placeholder:text-text-secondary/45 focus:border-accent focus:ring-2 focus:ring-accent/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500";

const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-primary dark:text-zinc-200";

const helperClass = "mt-1 text-xs text-text-secondary dark:text-zinc-400";

const cardClass =
  "rounded-2xl border border-border bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80 sm:p-8";

const TOKEN_HELP = [
  "{{lead.name}}",
  "{{lead.email}}",
  "{{lead.phone}}",
  "{{lead.source}}",
  "{{lead.url}}",
  "{{owner.name}}",
];

type Props = {
  enabled: boolean;
  template: NewLeadAlertTemplate;
  preference: NewLeadAlertPreference;
  profileEmail: string | null;
  profilePhone: string | null;
  canEditTemplate: boolean;
};

export default function NewLeadAlertAutomation({
  enabled,
  template,
  preference,
  profileEmail,
  profilePhone,
  canEditTemplate,
}: Props) {
  const router = useRouter();
  const [enabledOptimistic, setEnabledOptimistic] = useState(enabled);
  const [savingEnabled, startEnabled] = useTransition();
  const [savePref, startPref] = useTransition();
  const [saveTpl, startTpl] = useTransition();
  const [enabledErr, setEnabledErr] = useState<string | null>(null);
  const [prefMsg, setPrefMsg] = useState<string | null>(null);
  const [prefErr, setPrefErr] = useState<string | null>(null);
  const [tplMsg, setTplMsg] = useState<string | null>(null);
  const [tplErr, setTplErr] = useState<string | null>(null);

  function onToggleEnabled(next: boolean) {
    setEnabledOptimistic(next);
    setEnabledErr(null);
    const fd = new FormData();
    if (next) fd.set("enabled", "on");
    startEnabled(async () => {
      const res = await saveNewLeadAlertEnabled(fd);
      if ("error" in res && res.error) {
        setEnabledOptimistic(!next);
        setEnabledErr(res.error);
      } else {
        router.refresh();
      }
    });
  }

  function onSavePreference(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPrefMsg(null);
    setPrefErr(null);
    const fd = new FormData(e.currentTarget);
    startPref(async () => {
      const res = await saveMyLeadAlertOverrides(fd);
      if ("error" in res && res.error) setPrefErr(res.error);
      else {
        setPrefMsg("Preferences saved.");
        router.refresh();
      }
    });
  }

  function onSaveTemplate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTplMsg(null);
    setTplErr(null);
    const fd = new FormData(e.currentTarget);
    startTpl(async () => {
      const res = await saveNewLeadAlertTemplate(fd);
      if ("error" in res && res.error) setTplErr(res.error);
      else {
        setTplMsg("Template saved.");
        router.refresh();
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary dark:text-zinc-500">
        Automations
      </p>

      <div className="mt-4 flex flex-wrap items-start gap-4">
        <Link
          href="/automations"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white text-text-primary shadow-sm transition-colors hover:bg-surface dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Back to automations"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900"
            aria-hidden
          >
            <Workflow className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="heading-display text-2xl font-bold tracking-tight text-text-primary dark:text-zinc-100 sm:text-3xl">
                New lead alert
              </h1>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sky-800 dark:bg-sky-950/50 dark:text-sky-200">
                Leads
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary dark:text-zinc-400">
              <span className="font-medium text-text-primary/90 dark:text-zinc-300">
                Trigger:
              </span>{" "}
              When a new lead is created.{" "}
              <span className="font-medium text-text-primary/90 dark:text-zinc-300">
                Action:
              </span>{" "}
              Email + SMS to the lead owner (or team Admins when unassigned).
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 h-px w-full bg-accent/40" aria-hidden />

      <section className={`${cardClass} mt-8`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary dark:text-zinc-100">
              Flow status
            </h2>
            <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
              {canEditTemplate
                ? "Pause the flow to stop sending alerts without losing recipients or templates."
                : "Only Admins or Super Admins can pause this flow."}
            </p>
          </div>
          <label className="flex shrink-0 items-center gap-3 rounded-xl border border-border bg-surface/40 px-4 py-2.5 text-sm font-medium text-text-primary dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-100">
            <input
              type="checkbox"
              checked={enabledOptimistic}
              disabled={!canEditTemplate || savingEnabled}
              onChange={(e) => onToggleEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
            />
            <span
              className={
                enabledOptimistic
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-text-secondary dark:text-zinc-400"
              }
            >
              {enabledOptimistic ? "Enabled" : "Paused"}
            </span>
          </label>
        </div>
        {enabledErr ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {enabledErr}
          </p>
        ) : null}
      </section>

      <form onSubmit={onSavePreference} className={`${cardClass} mt-8`}>
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Mail className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary dark:text-zinc-100">
              My alerts
            </h2>
            <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
              Choose which channels to use when a new lead is assigned to you
              (or is unassigned but you are an Admin/Super Admin), and where
              those alerts should go.
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-5">
          <label className="flex items-start gap-3 rounded-xl border border-border bg-surface/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <input
              type="checkbox"
              name="email_new_lead"
              defaultChecked={preference.emailNewLead}
              className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent"
            />
            <span className="flex-1">
              <span className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-zinc-100">
                <Mail className="h-4 w-4" aria-hidden />
                Email me on new leads
              </span>
              <span className="mt-1 block text-xs text-text-secondary dark:text-zinc-400">
                Goes via the org&rsquo;s SendGrid integration.
              </span>
            </span>
          </label>

          <div>
            <label htmlFor="override_email" className={labelClass}>
              Send email to
            </label>
            <input
              id="override_email"
              name="override_email"
              type="email"
              defaultValue={preference.overrideEmail}
              className={inputClass}
              placeholder={profileEmail ?? "you@example.com"}
            />
            <p className={helperClass}>
              Leave blank to use your profile email{" "}
              <code className="rounded bg-surface px-1 py-0.5 text-[11px] dark:bg-zinc-800">
                {profileEmail ?? "(no email on profile)"}
              </code>
              .
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-border bg-surface/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <input
              type="checkbox"
              name="sms_new_lead"
              defaultChecked={preference.smsNewLead}
              className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent"
            />
            <span className="flex-1">
              <span className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-zinc-100">
                <MessageSquare className="h-4 w-4" aria-hidden />
                Text me on new leads
              </span>
              <span className="mt-1 block text-xs text-text-secondary dark:text-zinc-400">
                Goes via the org&rsquo;s Twilio integration.
              </span>
            </span>
          </label>

          <div>
            <label htmlFor="override_phone" className={labelClass}>
              Send SMS to (E.164)
            </label>
            <input
              id="override_phone"
              name="override_phone"
              type="tel"
              defaultValue={preference.overridePhone}
              className={inputClass}
              placeholder={profilePhone ?? "+14155551234"}
            />
            <p className={helperClass}>
              Leave blank to use your profile phone
              {profilePhone ? (
                <>
                  {" "}
                  <code className="rounded bg-surface px-1 py-0.5 text-[11px] dark:bg-zinc-800">
                    {profilePhone}
                  </code>
                </>
              ) : null}
              . Use international format with the leading + and country code.
            </p>
          </div>
        </div>

        {prefErr ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {prefErr}
          </p>
        ) : null}
        {prefMsg ? (
          <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">
            {prefMsg}
          </p>
        ) : null}

        <div className="mt-8">
          <button
            type="submit"
            disabled={savePref}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {savePref ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </form>

      <form onSubmit={onSaveTemplate} className={`${cardClass} mt-8`}>
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
            <Mail className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary dark:text-zinc-100">
              Team template{canEditTemplate ? "" : " (read-only)"}
            </h2>
            <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
              Same template is used for every channel. Tokens are substituted
              with the lead&rsquo;s data at send time.
            </p>
            <p className="mt-2 flex flex-wrap gap-1.5 text-xs text-text-secondary dark:text-zinc-500">
              {TOKEN_HELP.map((tok) => (
                <code
                  key={tok}
                  className="rounded bg-surface px-1.5 py-0.5 font-mono dark:bg-zinc-800"
                >
                  {tok}
                </code>
              ))}
            </p>
          </div>
        </div>

        <fieldset
          disabled={!canEditTemplate || saveTpl}
          className="mt-8 space-y-5"
        >
          <div>
            <label htmlFor="email_subject" className={labelClass}>
              Email subject
            </label>
            <input
              id="email_subject"
              name="email_subject"
              type="text"
              defaultValue={template.emailSubject}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="email_html" className={labelClass}>
              Email body (HTML)
            </label>
            <textarea
              id="email_html"
              name="email_html"
              rows={8}
              defaultValue={template.emailHtml}
              className={`${inputClass} font-mono text-xs`}
            />
            <p className={helperClass}>
              A plain-text fallback is generated automatically by stripping
              tags.
            </p>
          </div>

          <div>
            <label htmlFor="sms_body" className={labelClass}>
              SMS body
            </label>
            <textarea
              id="sms_body"
              name="sms_body"
              rows={4}
              defaultValue={template.smsBody}
              className={`${inputClass} font-mono text-xs`}
            />
            <p className={helperClass}>
              Keep under 160 characters to stay in a single SMS segment.
            </p>
          </div>
        </fieldset>

        {!canEditTemplate ? (
          <p className="mt-4 text-xs text-text-secondary dark:text-zinc-400">
            Only Admins or Super Admins can edit the team template.
          </p>
        ) : null}

        {tplErr ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {tplErr}
          </p>
        ) : null}
        {tplMsg ? (
          <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">
            {tplMsg}
          </p>
        ) : null}

        {canEditTemplate ? (
          <div className="mt-8">
            <button
              type="submit"
              disabled={saveTpl}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {saveTpl ? "Saving…" : "Save template"}
            </button>
          </div>
        ) : null}
      </form>
    </div>
  );
}
