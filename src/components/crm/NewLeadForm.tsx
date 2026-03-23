"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createLead } from "@/app/(crm)/actions/crm";
import { LEAD_PROJECT_TYPE_OPTIONS } from "@/lib/crm/mock-data";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/15";

export default function NewLeadForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await createLead(fd);
    setPending(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    e.currentTarget.reset();
    setMessage("Lead created.");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-border bg-white p-6 shadow-sm"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
        New lead
      </h2>
      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 text-sm text-emerald-800">{message}</p>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Name
          </label>
          <input name="name" type="text" className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Email
          </label>
          <input name="email" type="email" className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Company
          </label>
          <input name="company" type="text" className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Phone
          </label>
          <input name="phone" type="tel" className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Project type
          </label>
          <select
            name="project_type"
            required
            defaultValue=""
            className={inputClass}
          >
            <option value="" disabled>
              Select project type…
            </option>
            {LEAD_PROJECT_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Source
          </label>
          <input
            name="source"
            type="text"
            placeholder="e.g. website, referral"
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Notes
          </label>
          <textarea name="notes" rows={2} className={inputClass} />
        </div>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Saving…" : "Add lead"}
      </button>
    </form>
  );
}
