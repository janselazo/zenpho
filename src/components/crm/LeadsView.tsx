"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import {
  LEAD_STAGE_LABELS,
  LEAD_PROJECT_TYPE_OPTIONS,
  type LeadStage,
} from "@/lib/crm/mock-data";
import { createLead } from "@/app/(crm)/actions/crm";

export interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
  company: string | null;
  stage: string | null;
  source?: string | null;
  notes?: string | null;
  project_type?: string | null;
  created_at?: string | null;
}

const stageColors: Record<LeadStage, string> = {
  new: "#6b7280",
  contacted: "#3b82f6",
  qualified: "#8b5cf6",
  not_qualified: "#ef4444",
};

const stageBgClasses: Record<string, string> = {
  new: "bg-gray-100 text-gray-800",
  contacted: "bg-blue-100 text-blue-800",
  qualified: "bg-violet-100 text-violet-800",
  not_qualified: "bg-red-100 text-red-800",
};

const sourceBgClasses: Record<string, string> = {
  website: "bg-sky-100 text-sky-800",
  referral: "bg-teal-100 text-teal-800",
  linkedin: "bg-blue-100 text-blue-800",
  "cold outreach": "bg-orange-100 text-orange-800",
  conference: "bg-purple-100 text-purple-800",
  facebook: "bg-indigo-100 text-indigo-800",
};

function getSourceClasses(source: string) {
  const key = source.toLowerCase();
  return sourceBgClasses[key] ?? "bg-gray-100 text-gray-700";
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function LeadsView({ leads }: { leads: Lead[] }) {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = leads.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.name?.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.company?.toLowerCase().includes(q) ||
      l.source?.toLowerCase().includes(q) ||
      l.project_type?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-display text-2xl font-bold text-text-primary">
            Leads
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Track and manage your sales prospects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/50" />
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48 rounded-lg border border-border bg-white py-1.5 pl-8 pr-3 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/15"
            />
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover"
          >
            + Add Lead
          </button>
        </div>
      </div>

      {/* Count */}
      <div className="mt-4">
        <span className="text-sm text-text-secondary">
          {filtered.length} leads
        </span>
      </div>

      {/* Table */}
      <div className="mt-6">
        <LeadsTable leads={filtered} />
      </div>

      {modalOpen && (
        <NewLeadModal onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}

function LeadsTable({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white py-16 text-center text-sm text-text-secondary">
        No leads found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 font-semibold text-text-secondary">Name</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Phone</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Email</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Status</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Source</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">
              Project type
            </th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Date</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {leads.map((lead) => {
            const stage = (lead.stage ?? "new") as LeadStage;
            const initials = (lead.name ?? "?")
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            return (
              <tr key={lead.id} className="transition-colors hover:bg-surface/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: stageColors[stage] ?? "#6b7280" }}
                    >
                      {initials}
                    </span>
                    <Link
                      href={`/leads/${lead.id}`}
                      className="font-medium text-text-primary hover:text-accent"
                    >
                      {lead.name ?? "—"}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {lead.phone ?? "—"}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {lead.email ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      stageBgClasses[stage] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: stageColors[stage] }}
                    />
                    {LEAD_STAGE_LABELS[stage] ?? stage}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {lead.source ? (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getSourceClasses(lead.source)}`}>
                      {lead.source}
                    </span>
                  ) : (
                    <span className="text-text-secondary">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {lead.project_type ?? "—"}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {formatDate(lead.created_at)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function NewLeadModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await createLead(fd);
    setPending(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
    onClose();
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/15";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-xl"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        aria-modal="true"
        aria-labelledby="new-lead-title"
      >
        <h2
          id="new-lead-title"
          className="text-sm font-bold uppercase tracking-wider text-text-secondary"
        >
          New Lead
        </h2>

        {error && (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Name
              </label>
              <input name="name" type="text" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Email
              </label>
              <input name="email" type="email" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Company
              </label>
              <input name="company" type="text" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Phone
              </label>
              <input name="phone" type="tel" className={inputClass} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
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
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Source
            </label>
            <input
              name="source"
              type="text"
              placeholder="e.g. website, referral"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Notes
            </label>
            <textarea name="notes" rows={3} className={inputClass} />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {pending ? "Saving…" : "Add lead"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
