"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  FolderKanban,
  Handshake,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { deleteClient, updateClientRow } from "@/app/(crm)/actions/crm";
import CreateDealForLeadModal from "@/components/crm/CreateDealForLeadModal";
import CrmNewProjectForClientModal from "@/components/crm/CrmNewProjectForClientModal";

export type ClientTableRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  created_at: string | null;
  /** Most recent lead that converted to this client, if any */
  linkedLead: {
    id: string;
    name: string | null;
    email: string | null;
    company: string | null;
    /** Same `lead.source` as on the Leads table */
    source: string | null;
  } | null;
  /** Latest non-empty deal title for the linked lead (by deal.updated_at) */
  dealName: string | null;
};

const neutralChipBase =
  "inline-flex rounded-full border border-border bg-white px-2.5 py-0.5 text-xs font-semibold dark:border-zinc-600 dark:bg-zinc-900/35";

/** Match Leads table source pill colors */
const sourceTextClasses: Record<string, string> = {
  website: "text-sky-700 dark:text-sky-400",
  referral: "text-teal-700 dark:text-teal-400",
  linkedin: "text-blue-700 dark:text-blue-400",
  "cold outreach": "text-orange-700 dark:text-orange-400",
  conference: "text-purple-700 dark:text-purple-400",
  facebook: "text-indigo-700 dark:text-indigo-400",
};

function getSourceTextClass(source: string) {
  return (
    sourceTextClasses[source.toLowerCase()] ??
    "text-zinc-700 dark:text-zinc-300"
  );
}

const inlineInputClass =
  "w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-text-primary outline-none placeholder:text-zinc-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500";

function formatClientPhone(phone: string | null | undefined): string {
  if (!phone?.trim()) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone.trim();
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type ClientDraft = {
  name: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
};

function clientToDraft(c: ClientTableRow): ClientDraft {
  return {
    name: c.name ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    company: c.company ?? "",
    notes: c.notes ?? "",
  };
}

export default function ClientsView({ clients }: { clients: ClientTableRow[] }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(clients);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ClientDraft | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [projectForClient, setProjectForClient] =
    useState<ClientTableRow | null>(null);
  const [dealForLead, setDealForLead] = useState<ClientTableRow | null>(null);

  useEffect(() => {
    setSnapshot(clients);
  }, [clients]);

  function startEdit(c: ClientTableRow) {
    setEditingId(c.id);
    setDraft(clientToDraft(c));
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  async function saveEdit(clientId: string) {
    if (!draft) return;
    setSavePending(true);
    const fd = new FormData();
    fd.set("id", clientId);
    fd.set("name", draft.name.trim());
    fd.set("email", draft.email.trim());
    fd.set("phone", draft.phone.trim());
    fd.set("company", draft.company.trim());
    fd.set("notes", draft.notes.trim());
    const res = await updateClientRow(fd);
    setSavePending(false);
    if ("error" in res && res.error) {
      window.alert(res.error);
      return;
    }
    cancelEdit();
    router.refresh();
  }

  async function handleDelete(c: ClientTableRow) {
    const label = c.name?.trim() || c.email?.trim() || "this client";
    if (
      !confirm(
        `Delete ${label}? Linked projects will be removed. Leads stay but lose the client link.`
      )
    ) {
      return;
    }
    if (editingId === c.id) cancelEdit();
    setDeletingId(c.id);
    const res = await deleteClient(c.id);
    setDeletingId(null);
    if ("error" in res && res.error) {
      window.alert(res.error);
      return;
    }
    router.refresh();
  }

  if (snapshot.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-border bg-white py-16 text-center text-sm text-text-secondary">
        No clients yet. A client record is created when a deal for a lead reaches
        Won or Lost (once per lead).
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
      <table className="w-full min-w-[72rem] text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 font-semibold text-text-secondary">Name</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Phone</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Email</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Status</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Project</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Company</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Source</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Date</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {snapshot.map((c) => {
            const isEditing = editingId === c.id && draft !== null;
            const initials = (c.name ?? "?")
              .split(/\s+/)
              .filter(Boolean)
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            const deleteLabel = c.name?.trim() || c.email?.trim() || "this client";

            return (
              <tr
                key={c.id}
                className={`transition-colors ${
                  isEditing
                    ? "bg-sky-50/60 dark:bg-sky-950/25"
                    : "hover:bg-surface/50"
                }`}
              >
                <td className="px-4 py-3 align-top">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E8F1FB] text-xs font-bold text-[#4086D6] dark:bg-sky-950/50 dark:text-sky-400"
                      aria-hidden
                    >
                      {initials || "?"}
                    </span>
                    {isEditing && draft ? (
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <input
                          type="text"
                          value={draft.name}
                          onChange={(e) =>
                            setDraft((d) =>
                              d ? { ...d, name: e.target.value } : d
                            )
                          }
                          placeholder="Name"
                          className={inlineInputClass}
                          autoComplete="name"
                        />
                        <textarea
                          value={draft.notes}
                          onChange={(e) =>
                            setDraft((d) =>
                              d ? { ...d, notes: e.target.value } : d
                            )
                          }
                          placeholder="Notes (optional)"
                          rows={2}
                          className={`${inlineInputClass} resize-y`}
                        />
                      </div>
                    ) : (
                      <span className="min-w-0 font-medium text-text-primary">
                        {c.name?.trim() || "—"}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  {isEditing && draft ? (
                    <input
                      type="tel"
                      value={draft.phone}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, phone: e.target.value } : d
                        )
                      }
                      placeholder="(555) 000-0000"
                      className={inlineInputClass}
                    />
                  ) : (
                    <span className="text-text-secondary">
                      {formatClientPhone(c.phone)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  {isEditing && draft ? (
                    <input
                      type="email"
                      value={draft.email}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, email: e.target.value } : d
                        )
                      }
                      placeholder="name@company.com"
                      className={inlineInputClass}
                    />
                  ) : (
                    <span className="text-text-secondary">{c.email ?? "—"}</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  <span
                    className={`${neutralChipBase} items-center gap-1.5 font-medium text-emerald-800 dark:text-emerald-300`}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-2 ring-border dark:ring-zinc-600"
                      aria-hidden
                    />
                    Client
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  {c.dealName?.trim() ? (
                    <span
                      className={`${neutralChipBase} font-medium text-sky-800 dark:text-sky-300`}
                    >
                      {c.dealName.trim()}
                    </span>
                  ) : (
                    <span className="text-text-secondary">—</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  {isEditing && draft ? (
                    <input
                      type="text"
                      value={draft.company}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, company: e.target.value } : d
                        )
                      }
                      placeholder="Company"
                      className={inlineInputClass}
                    />
                  ) : c.company?.trim() ? (
                    <span
                      className={`${neutralChipBase} font-medium text-amber-800 dark:text-amber-300`}
                    >
                      {c.company}
                    </span>
                  ) : (
                    <span className="text-text-secondary">—</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  {c.linkedLead?.source?.trim() ? (
                    <span
                      className={`${neutralChipBase} font-medium capitalize ${getSourceTextClass(c.linkedLead.source)}`}
                    >
                      {c.linkedLead.source.trim()}
                    </span>
                  ) : (
                    <span className="text-text-secondary">—</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-text-secondary">
                  {formatDate(c.created_at)}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-wrap items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          disabled={savePending}
                          onClick={() => void saveEdit(c.id)}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                          aria-label="Save changes"
                        >
                          {savePending ? (
                            <Loader2
                              className="h-4 w-4 shrink-0 animate-spin"
                              aria-hidden
                            />
                          ) : (
                            <Check className="h-4 w-4 shrink-0" aria-hidden />
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={savePending}
                          onClick={cancelEdit}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40"
                          aria-label="Discard changes"
                        >
                          <X className="h-4 w-4 shrink-0" aria-hidden />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setProjectForClient(c)}
                          disabled={editingId !== null}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-violet-600 transition-colors hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-violet-400 dark:hover:bg-violet-950/40"
                          aria-label={`New project for ${deleteLabel}`}
                          title="Create project"
                        >
                          <FolderKanban className="h-4 w-4 shrink-0" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDealForLead(c)}
                          disabled={editingId !== null || !c.linkedLead}
                          title={
                            c.linkedLead
                              ? "Create deal (linked lead)"
                              : "No linked lead — deals are tied to leads"
                          }
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          aria-label={`Create deal for ${deleteLabel}`}
                        >
                          <Handshake className="h-4 w-4 shrink-0" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          disabled={Boolean(editingId && editingId !== c.id)}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          aria-label={`Edit ${deleteLabel}`}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4 shrink-0" aria-hidden />
                        </button>
                        <button
                          type="button"
                          disabled={
                            deletingId === c.id ||
                            Boolean(editingId && editingId !== c.id)
                          }
                          onClick={() => void handleDelete(c)}
                          aria-busy={deletingId === c.id}
                          className="inline-flex items-center justify-center rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/40"
                          aria-label={`Delete ${deleteLabel}`}
                        >
                          {deletingId === c.id ? (
                            <Loader2
                              className="h-4 w-4 shrink-0 animate-spin"
                              aria-hidden
                            />
                          ) : (
                            <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {projectForClient ? (
        <CrmNewProjectForClientModal
          clientId={projectForClient.id}
          clientName={projectForClient.name}
          company={projectForClient.company}
          onClose={() => setProjectForClient(null)}
        />
      ) : null}

      {dealForLead?.linkedLead ? (
        <CreateDealForLeadModal
          lead={dealForLead.linkedLead}
          onClose={() => setDealForLead(null)}
        />
      ) : null}
    </div>
  );
}
