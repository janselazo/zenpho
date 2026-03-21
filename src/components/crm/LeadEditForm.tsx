"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateLead } from "@/app/(crm)/actions/crm";

const inputClass =
  "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/15";

const stages = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
] as const;

type Lead = {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  phone: string | null;
  source: string | null;
  stage: string | null;
  notes: string | null;
};

export default function LeadEditForm({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await updateLead(fd);
    setPending(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-border bg-white p-6 shadow-sm"
    >
      <input type="hidden" name="id" value={lead.id} />
      {error ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="mb-4 text-sm text-emerald-800">Saved.</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Name
          </label>
          <input
            name="name"
            type="text"
            defaultValue={lead.name ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Email
          </label>
          <input
            name="email"
            type="email"
            defaultValue={lead.email ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Company
          </label>
          <input
            name="company"
            type="text"
            defaultValue={lead.company ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Phone
          </label>
          <input
            name="phone"
            type="tel"
            defaultValue={lead.phone ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Source
          </label>
          <input
            name="source"
            type="text"
            defaultValue={lead.source ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Stage
          </label>
          <select
            name="stage"
            defaultValue={lead.stage ?? "new"}
            className={inputClass}
          >
            {stages.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Notes
          </label>
          <textarea
            name="notes"
            rows={4}
            defaultValue={lead.notes ?? ""}
            className={inputClass}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-6 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
