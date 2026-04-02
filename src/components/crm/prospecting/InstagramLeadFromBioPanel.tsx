"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { assignProspectTagToLead, createLead } from "@/app/(crm)/actions/crm";
import { fetchInstagramBioFromUrlAction } from "@/app/(crm)/actions/prospect-intel";
import type { MergedCrmFieldOptions } from "@/lib/crm/field-options";
import {
  buildInstagramLeadNotes,
  extractContactSignalsFromPlainText,
  parseInstagramProfileUrl,
  suggestedDisplayName,
  type InstagramContactSignals,
} from "@/lib/crm/instagram-lead-parse";
import { useRouter } from "next/navigation";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

type Props = {
  fieldOptions: MergedCrmFieldOptions;
  defaultProjectType: string;
};

export default function InstagramLeadFromBioPanel({
  fieldOptions,
  defaultProjectType,
}: Props) {
  const router = useRouter();
  const [igUrl, setIgUrl] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [bioFetchLoading, setBioFetchLoading] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [signals, setSignals] = useState<InstagramContactSignals | null>(null);
  const [profileMeta, setProfileMeta] = useState<{ handle: string; profileUrl: string } | null>(
    null
  );

  const defaultInstagramSource = useMemo(() => {
    const match = fieldOptions.leadSources.find((s) => s.toLowerCase() === "instagram");
    return match ?? "";
  }, [fieldOptions.leadSources]);

  const [projectType, setProjectType] = useState(defaultProjectType);
  const [source, setSource] = useState(defaultInstagramSource);

  useEffect(() => {
    setProjectType((cur) =>
      fieldOptions.leadProjectTypes.includes(cur) ? cur : defaultProjectType
    );
  }, [fieldOptions.leadProjectTypes, defaultProjectType]);

  const runExtractWithBio = useCallback(
    (bio: string) => {
      const parsed = parseInstagramProfileUrl(igUrl);
      if (!parsed.ok) {
        setParseError(parsed.error);
        setProfileMeta(null);
        setSignals(null);
        return;
      }
      const trimmed = bio.trim();
      if (!trimmed) {
        setParseError("No bio text to parse.");
        setProfileMeta(null);
        setSignals(null);
        return;
      }

      const sig = extractContactSignalsFromPlainText(trimmed);
      setSignals(sig);
      setProfileMeta({ handle: parsed.handle, profileUrl: parsed.profileUrl });

      const display = suggestedDisplayName(parsed.handle, trimmed);
      setName(display);
      setCompany(display.startsWith("@") ? "" : display);
      setEmail(sig.emails[0] ?? "");
      setPhone(sig.phones[0] ?? "");
      setNotes(
        buildInstagramLeadNotes({
          profileUrl: parsed.profileUrl,
          handle: parsed.handle,
          bio: trimmed,
          signals: sig,
          bioSource: "fetched",
        })
      );

      if (defaultInstagramSource && fieldOptions.leadSources.includes(defaultInstagramSource)) {
        setSource(defaultInstagramSource);
      }
    },
    [igUrl, defaultInstagramSource, fieldOptions.leadSources]
  );

  const applyExtract = useCallback(async () => {
    setParseError(null);
    const parsed = parseInstagramProfileUrl(igUrl);
    if (!parsed.ok) {
      setParseError(parsed.error);
      setProfileMeta(null);
      setSignals(null);
      return;
    }

    setBioFetchLoading(true);
    try {
      const fetched = await fetchInstagramBioFromUrlAction(igUrl);
      if (!fetched.ok) {
        setParseError(fetched.error);
        setProfileMeta(null);
        setSignals(null);
        return;
      }
      runExtractWithBio(fetched.bioText);
    } finally {
      setBioFetchLoading(false);
    }
  }, [igUrl, runExtractWithBio]);

  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function onCreateLead(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setMessage(null);
    if (!name.trim() && !email.trim()) {
      setSubmitError("Add at least a name or email (use Extract & preview first).");
      return;
    }
    if (!projectType.trim()) {
      setSubmitError("Select a project type.");
      return;
    }
    setPending(true);
    const fd = new FormData();
    fd.set("name", name.trim() || "Unknown");
    if (email.trim()) fd.set("email", email.trim());
    if (company.trim()) fd.set("company", company.trim());
    if (phone.trim()) fd.set("phone", phone.trim());
    if (source.trim()) fd.set("source", source.trim());
    fd.set("notes", notes.trim());
    fd.set("project_type", projectType.trim());
    const res = await createLead(fd);
    setPending(false);
    if ("error" in res && res.error) {
      setSubmitError(res.error);
      return;
    }
    if ("id" in res && typeof res.id === "string") {
      const tagRes = await assignProspectTagToLead(res.id);
      if (tagRes && "error" in tagRes) {
        console.error("assignProspectTagToLead:", tagRes.error);
      }
    }
    setMessage("Lead created.");
    router.refresh();
  }

  return (
    <div className="mt-6 border-t border-border pt-6 dark:border-zinc-800">
      <h2 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
        Instagram profile
      </h2>
      <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
        Enter a profile URL or @handle, then{" "}
        <span className="font-medium text-text-primary dark:text-zinc-300">Extract &amp; preview</span>. We fetch
        the public profile HTML on the server and parse name, bio, and contact hints. Meta often blocks this—if it
        fails, fill name, email, and phone in the preview below yourself.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
            Instagram profile URL or @handle
          </label>
          <input
            type="text"
            value={igUrl}
            onChange={(e) => setIgUrl(e.target.value)}
            placeholder="https://www.instagram.com/username/ or @username"
            className={inputClass}
            autoComplete="off"
          />
        </div>
        <button
          type="button"
          disabled={bioFetchLoading}
          onClick={() => void applyExtract()}
          className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-text-primary hover:bg-surface disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {bioFetchLoading ? "Fetching bio…" : "Extract &amp; preview"}
        </button>
        {parseError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {parseError}
          </p>
        ) : null}
      </div>

      {profileMeta && signals ? (
        <form onSubmit={(ev) => void onCreateLead(ev)} className="mt-6 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary/70 dark:text-zinc-500">
            Lead preview
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                Company (optional)
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                Project type
              </label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                required
                className={inputClass}
              >
                {fieldOptions.leadProjectTypes.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                Source
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className={inputClass}
              >
                <option value="">Not set</option>
                {fieldOptions.leadSources.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-text-secondary dark:text-zinc-400">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={8}
                className={inputClass}
              />
            </div>
          </div>
          {submitError ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {submitError}
            </p>
          ) : null}
          {message ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? "Creating…" : "Create lead"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
