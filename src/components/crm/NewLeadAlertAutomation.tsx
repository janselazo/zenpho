"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  Mail,
  MessageSquare,
  Pilcrow,
  Workflow,
} from "lucide-react";
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

type TokenChip = { label: string; value: string; description: string };

const TOKENS: TokenChip[] = [
  { label: "Lead name", value: "{{lead.name}}", description: "Full name from the lead form." },
  { label: "Lead email", value: "{{lead.email}}", description: "Email address the lead submitted." },
  { label: "Lead phone", value: "{{lead.phone}}", description: "Phone number the lead submitted." },
  { label: "Lead source", value: "{{lead.source}}", description: "Where the lead came from (e.g. Facebook Lead Ads)." },
  { label: "CRM link", value: "{{lead.url}}", description: "Direct link to open the lead in the CRM." },
  { label: "Owner name", value: "{{owner.name}}", description: "Name of the assigned owner (or recipient if unassigned)." },
  { label: "Form name", value: "{{lead.formName}}", description: "Name of the Facebook Lead Ad form the lead was submitted through." },
  {
    label: "All form answers",
    value: "{{lead.answers}}",
    description:
      "Renders every custom question the lead answered (Facebook Lead Ads). Becomes a bulleted list in email and one-per-line in SMS.",
  },
];

type Props = {
  enabled: boolean;
  template: NewLeadAlertTemplate;
  preference: NewLeadAlertPreference;
  profileEmail: string | null;
  profilePhone: string | null;
  canEditTemplate: boolean;
};

type FocusTarget =
  | { kind: "input"; el: HTMLInputElement | HTMLTextAreaElement }
  | { kind: "rte"; api: RichTextHandle };

type RichTextHandle = {
  insertText: (text: string) => void;
  getHTML: () => string;
  focus: () => void;
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

  // Tokens insert into whichever field was focused last. The rich-text editor
  // and the plain inputs both register themselves through `setFocused`.
  const focusedRef = useRef<FocusTarget | null>(null);
  const subjectRef = useRef<HTMLInputElement | null>(null);
  const smsRef = useRef<HTMLTextAreaElement | null>(null);
  const rteRef = useRef<RichTextHandle | null>(null);
  const emailHtmlHiddenRef = useRef<HTMLInputElement | null>(null);

  const setFocused = useCallback((target: FocusTarget) => {
    focusedRef.current = target;
  }, []);

  const insertToken = useCallback((value: string) => {
    const target = focusedRef.current;
    if (!target) {
      // Default: drop into the body editor when nothing has been focused yet.
      rteRef.current?.focus();
      rteRef.current?.insertText(value);
      return;
    }
    if (target.kind === "input") {
      const el = target.el;
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      el.setRangeText(value, start, end, "end");
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.focus();
    } else {
      target.api.focus();
      target.api.insertText(value);
    }
  }, []);

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
    // Sync the rich editor's HTML into the hidden input right before serializing.
    if (emailHtmlHiddenRef.current && rteRef.current) {
      emailHtmlHiddenRef.current.value = rteRef.current.getHTML();
    }
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
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-text-primary dark:text-zinc-100">
              Team template{canEditTemplate ? "" : " (read-only)"}
            </h2>
            <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
              Same template is used for every channel. Click a variable to drop
              it into whichever field you last typed in &mdash; we&rsquo;ll
              swap them for the lead&rsquo;s data when the alert is sent.
            </p>
          </div>
        </div>

        <TokenBar
          tokens={TOKENS}
          onInsert={insertToken}
          disabled={!canEditTemplate}
        />
        <p className="mt-2 text-xs text-text-secondary dark:text-zinc-400">
          For a single answer from a Facebook form, type{" "}
          <code className="rounded bg-surface px-1 py-0.5 font-mono dark:bg-zinc-800">
            &#123;&#123;lead.answer:your_question_key&#125;&#125;
          </code>
          . Find each form&rsquo;s question keys under{" "}
          <Link
            href="/settings/integrations/facebook"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Settings &rarr; Integrations &rarr; Facebook
          </Link>
          .
        </p>

        <fieldset
          disabled={!canEditTemplate || saveTpl}
          className="mt-6 space-y-5"
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
              ref={subjectRef}
              onFocus={() => {
                if (subjectRef.current)
                  setFocused({ kind: "input", el: subjectRef.current });
              }}
            />
          </div>

          <div>
            <span className={labelClass}>Email body</span>
            <RichTextEditor
              defaultHTML={template.emailHtml}
              disabled={!canEditTemplate}
              registerHandle={(api) => {
                rteRef.current = api;
              }}
              onFocus={() => {
                if (rteRef.current)
                  setFocused({ kind: "rte", api: rteRef.current });
              }}
            />
            <input
              type="hidden"
              name="email_html"
              ref={emailHtmlHiddenRef}
              defaultValue={template.emailHtml}
            />
            <p className={helperClass}>
              Use the toolbar to format text. A plain-text fallback is
              generated automatically for clients that don&rsquo;t render HTML.
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
              className={inputClass}
              ref={smsRef}
              onFocus={() => {
                if (smsRef.current)
                  setFocused({ kind: "input", el: smsRef.current });
              }}
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

function TokenBar({
  tokens,
  onInsert,
  disabled,
}: {
  tokens: TokenChip[];
  onInsert: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-border bg-surface/40 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary dark:text-zinc-400">
        Variables &middot; click to insert
      </p>
      <div className="flex flex-wrap gap-1.5">
        {tokens.map((tok) => (
          <button
            key={tok.value}
            type="button"
            disabled={disabled}
            onMouseDown={(e) => {
              // Prevent stealing focus from the active editor so insertion
              // happens at the user's actual caret position.
              e.preventDefault();
            }}
            onClick={() => onInsert(tok.value)}
            title={`${tok.description} — inserts ${tok.value}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium text-text-primary shadow-sm transition-colors hover:border-accent hover:bg-accent/5 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-accent dark:hover:bg-accent/10"
          >
            <span>{tok.label}</span>
            <code className="rounded bg-surface/70 px-1 py-0.5 font-mono text-[10px] text-text-secondary dark:bg-zinc-800 dark:text-zinc-400">
              {tok.value}
            </code>
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Rich text editor                                                            */
/* -------------------------------------------------------------------------- */

type ToolbarCmd =
  | { kind: "exec"; cmd: "bold" | "italic" | "insertUnorderedList" | "formatBlock"; arg?: string; icon: React.ComponentType<{ className?: string }>; label: string }
  | { kind: "link"; icon: React.ComponentType<{ className?: string }>; label: string };

const TOOLBAR: ToolbarCmd[] = [
  { kind: "exec", cmd: "bold", icon: Bold, label: "Bold" },
  { kind: "exec", cmd: "italic", icon: Italic, label: "Italic" },
  { kind: "exec", cmd: "insertUnorderedList", icon: List, label: "Bulleted list" },
  { kind: "exec", cmd: "formatBlock", arg: "p", icon: Pilcrow, label: "Paragraph" },
  { kind: "link", icon: LinkIcon, label: "Insert link" },
];

function RichTextEditor({
  defaultHTML,
  disabled,
  registerHandle,
  onFocus,
}: {
  defaultHTML: string;
  disabled?: boolean;
  registerHandle: (api: RichTextHandle) => void;
  onFocus: () => void;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  // Stable handle so the parent's setFocused can call the latest implementation.
  const handle = useMemo<RichTextHandle>(
    () => ({
      insertText: (text: string) => {
        const el = editorRef.current;
        if (!el) return;
        el.focus();
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) {
          // No selection inside the editor yet — append at the end.
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
        document.execCommand("insertText", false, text);
      },
      getHTML: () => sanitizeHTML(editorRef.current?.innerHTML ?? ""),
      focus: () => editorRef.current?.focus(),
    }),
    []
  );

  useEffect(() => {
    registerHandle(handle);
  }, [handle, registerHandle]);

  function exec(cmd: string, arg?: string) {
    editorRef.current?.focus();
    if (cmd === "formatBlock") {
      // Some browsers want the tag wrapped in angle brackets.
      document.execCommand("formatBlock", false, `<${arg ?? "p"}>`);
    } else {
      document.execCommand(cmd, false, arg);
    }
  }

  function insertLink() {
    const url = window.prompt("Link URL (https://…)");
    if (!url) return;
    const safe = isSafeUrl(url) ? url : "";
    if (!safe) {
      window.alert("Only http(s) and mailto: links are allowed.");
      return;
    }
    editorRef.current?.focus();
    document.execCommand("createLink", false, safe);
  }

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/15 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-1.5 dark:border-zinc-800">
        {TOOLBAR.map((item) => {
          const Icon = item.icon;
          const onClick = () => {
            if (item.kind === "exec") exec(item.cmd, item.arg);
            else insertLink();
          };
          return (
            <button
              key={item.label}
              type="button"
              disabled={disabled}
              title={item.label}
              aria-label={item.label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onClick}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
      <div
        ref={editorRef}
        role="textbox"
        aria-multiline
        aria-label="Email body"
        contentEditable={!disabled}
        suppressContentEditableWarning
        onFocus={onFocus}
        className="min-h-[180px] max-w-none px-3.5 py-3 text-sm leading-6 text-text-primary outline-none [&_a]:text-accent [&_a]:underline [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 dark:text-zinc-100"
        // Initial content only; React will not re-render this node afterwards
        // because contentEditable owns the DOM. Saving still works because we
        // read `.innerHTML` on submit.
        dangerouslySetInnerHTML={{ __html: sanitizeHTML(defaultHTML) }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sanitization                                                                */
/* -------------------------------------------------------------------------- */

const ALLOWED_TAGS = new Set([
  "P",
  "BR",
  "STRONG",
  "B",
  "EM",
  "I",
  "U",
  "UL",
  "OL",
  "LI",
  "A",
  "DIV",
  "SPAN",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(["href", "target", "rel"]),
};

function sanitizeHTML(html: string): string {
  if (typeof document === "undefined") return html;
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  walk(tpl.content);
  return tpl.innerHTML;
}

function walk(node: Node) {
  const children = Array.from(node.childNodes);
  for (const child of children) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      if (!ALLOWED_TAGS.has(el.tagName)) {
        // Replace disallowed tag with its text content.
        const text = document.createTextNode(el.textContent ?? "");
        el.replaceWith(text);
        continue;
      }
      const allowedAttrs = ALLOWED_ATTRS[el.tagName] ?? new Set<string>();
      for (const attr of Array.from(el.attributes)) {
        if (!allowedAttrs.has(attr.name)) {
          el.removeAttribute(attr.name);
          continue;
        }
        if (attr.name === "href" && !isSafeUrl(attr.value)) {
          el.removeAttribute(attr.name);
        }
      }
      if (el.tagName === "A") {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }
      walk(el);
    }
  }
}

function isSafeUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  // Allow tokens to flow through unchanged ({{lead.url}}).
  if (trimmed.startsWith("{{") && trimmed.endsWith("}}")) return true;
  return /^(https?:\/\/|mailto:)/i.test(trimmed);
}
