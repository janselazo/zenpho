"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import KanbanBoard, { type KanbanColumn } from "@/components/crm/KanbanBoard";
import {
  createDealRecord,
  deleteDealRecord,
  updateDealRecord,
  updateDealStage,
} from "@/app/(crm)/actions/crm";
import type { LeadDealPickerOption } from "@/lib/crm/fetch-leads-for-deal-picker";
import {
  type MockDeal,
  type DealStage,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_COLORS,
} from "@/lib/crm/mock-data";

type ViewMode = "table" | "pipeline";

const stageOrder: DealStage[] = [
  "prospect",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
];

const stageBgClasses: Record<DealStage, string> = {
  prospect: "bg-gray-100 text-gray-800",
  proposal: "bg-blue-100 text-blue-800",
  negotiation: "bg-amber-100 text-amber-800",
  closed_won: "bg-emerald-100 text-emerald-800",
  closed_lost: "bg-red-100 text-red-800",
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DealsView({
  deals,
  persistDeals = false,
  leadPickerOptions = [],
}: {
  deals: MockDeal[];
  persistDeals?: boolean;
  leadPickerOptions?: LeadDealPickerOption[];
}) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [localDeals, setLocalDeals] = useState<MockDeal[]>(deals);
  const [modalOpen, setModalOpen] = useState(false);
  const [createDealOpen, setCreateDealOpen] = useState(false);
  const [editing, setEditing] = useState<MockDeal | null>(null);

  useEffect(() => {
    setLocalDeals(deals);
  }, [deals]);

  const filtered = localDeals.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.company.toLowerCase().includes(q) ||
      d.contactName.toLowerCase().includes(q)
    );
  });

  const kanbanColumns: KanbanColumn<MockDeal>[] = stageOrder.map((stage) => ({
    id: stage,
    label: DEAL_STAGE_LABELS[stage],
    color: DEAL_STAGE_COLORS[stage],
    items: filtered.filter((d) => d.stage === stage),
  }));

  const totalValue = filtered.reduce((sum, d) => sum + d.value, 0);

  async function handleMove(itemId: string, _from: string, to: string) {
    if (persistDeals) {
      const res = await updateDealStage(itemId, to);
      if (res.error) {
        alert(res.error);
        return;
      }
      router.refresh();
      return;
    }
    setLocalDeals((prev) =>
      prev.map((d) =>
        d.id === itemId ? { ...d, stage: to as DealStage } : d
      )
    );
  }

  function handleLocalSave(updated: MockDeal) {
    setLocalDeals((prev) =>
      prev.map((d) => (d.id === updated.id ? updated : d))
    );
    setEditing(null);
  }

  async function handlePersistSave(updated: MockDeal) {
    const res = await updateDealRecord({
      dealId: updated.id,
      title: updated.title,
      company: updated.company,
      value: updated.value,
      stage: updated.stage,
      expectedClose: updated.expectedClose.trim() || null,
      contactEmail: updated.contactEmail.trim() || null,
    });
    if (res.error) return res.error;
    setEditing(null);
    router.refresh();
    return undefined;
  }

  async function handleDelete(id: string) {
    if (persistDeals) {
      const res = await deleteDealRecord(id);
      if (res.error) {
        alert(res.error);
        return;
      }
      setEditing(null);
      router.refresh();
      return;
    }
    setLocalDeals((prev) => prev.filter((d) => d.id !== id));
    setEditing(null);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="heading-display text-2xl font-bold text-text-primary">
            Deals
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Track opportunities from prospect to close
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
          {persistDeals ? (
            <button
              type="button"
              onClick={() => setCreateDealOpen(true)}
              className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover"
            >
              Create deal
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover"
            >
              + Add Deal
            </button>
          )}
        </div>
      </div>

      {/* View toggles + stats */}
      <div className="mt-4 flex items-center gap-4">
        <div className="inline-flex rounded-lg border border-border bg-surface/50 p-0.5">
          {(["table", "pipeline"] as ViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                view === v
                  ? "bg-white text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {v === "pipeline" ? "Pipeline" : "Table"}
            </button>
          ))}
        </div>
        <span className="text-sm text-text-secondary">
          {filtered.length} deals · {formatCurrency(totalValue)} total
        </span>
      </div>

      {/* Content */}
      <div className="mt-6">
        {view === "table" && (
          <DealsTable
            deals={filtered}
            onEdit={setEditing}
            onDelete={(id) => {
              if (
                !confirm(
                  "Delete this deal? This cannot be undone from here."
                )
              ) {
                return;
              }
              handleDelete(id);
            }}
          />
        )}
        {view === "pipeline" && (
          <KanbanBoard
            columns={kanbanColumns}
            onMove={handleMove}
            renderCard={(deal) => (
              <button
                type="button"
                onClick={() => setEditing(deal)}
                className="w-full rounded-xl border border-border bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md"
              >
                <p className="text-sm font-medium text-text-primary">
                  {deal.title}
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  {deal.company}
                </p>
                <p className="mt-2 text-sm font-semibold text-text-primary">
                  {formatCurrency(deal.value)}
                </p>
              </button>
            )}
          />
        )}
      </div>

      {modalOpen && (
        <NewDealModal
          onClose={() => setModalOpen(false)}
          onAdd={(deal) => {
            setLocalDeals((prev) => [deal, ...prev]);
            setModalOpen(false);
          }}
        />
      )}

      {createDealOpen && (
        <CreateDealModal
          leadOptions={leadPickerOptions}
          onClose={() => setCreateDealOpen(false)}
        />
      )}

      {editing && (
        <EditDealModal
          deal={editing}
          lockContactFields={persistDeals}
          onClose={() => setEditing(null)}
          onSave={async (updated) => {
            if (persistDeals) return handlePersistSave(updated);
            handleLocalSave(updated);
            return undefined;
          }}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

function DealsTable({
  deals,
  onEdit,
  onDelete,
}: {
  deals: MockDeal[];
  onEdit: (deal: MockDeal) => void;
  onDelete: (id: string) => void;
}) {
  if (deals.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white py-16 text-center text-sm text-text-secondary">
        No deals found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-4 py-3 font-semibold text-text-secondary">Deal</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Company</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Budget</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Stage</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Contact</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Expected Close</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {deals.map((deal) => {
            const initials = deal.company
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);
            return (
              <tr key={deal.id} className="transition-colors hover:bg-surface/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: DEAL_STAGE_COLORS[deal.stage] }}
                    >
                      {initials}
                    </span>
                    <button
                      type="button"
                      onClick={() => onEdit(deal)}
                      className="font-medium text-text-primary hover:text-accent"
                    >
                      {deal.title}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-text-secondary">{deal.company}</td>
                <td className="px-4 py-3 font-medium text-text-primary">
                  {formatCurrency(deal.value)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${stageBgClasses[deal.stage]}`}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: DEAL_STAGE_COLORS[deal.stage] }}
                    />
                    {DEAL_STAGE_LABELS[deal.stage]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="text-text-primary">{deal.contactName}</p>
                    <p className="text-xs text-text-secondary">{deal.contactEmail}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {formatDate(deal.expectedClose)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <button
                      type="button"
                      onClick={() => onEdit(deal)}
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(deal.id)}
                      className="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const INPUT_CLASS =
  "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/15";

function DealFormFields({
  deal,
  lockContactFields,
  includeWebsite,
}: {
  deal?: MockDeal;
  lockContactFields?: boolean;
  includeWebsite?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-text-primary">
          Deal Title
        </label>
        <input
          name="title"
          type="text"
          required
          defaultValue={deal?.title}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-text-primary">
          Company
        </label>
        <input
          name="company"
          type="text"
          defaultValue={deal?.company}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-text-primary">
          Budget ($)
        </label>
        <input
          name="value"
          type="number"
          min="0"
          defaultValue={deal?.value}
          className={INPUT_CLASS}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-text-primary">
          Stage
        </label>
        <select
          name="stage"
          defaultValue={deal?.stage ?? "prospect"}
          className={INPUT_CLASS}
        >
          {stageOrder.map((s) => (
            <option key={s} value={s}>
              {DEAL_STAGE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-text-primary">
          Expected Close
        </label>
        <input
          name="expectedClose"
          type="date"
          defaultValue={deal?.expectedClose}
          className={INPUT_CLASS}
        />
      </div>
      {includeWebsite && (
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-text-primary">
            Website
          </label>
          <input
            name="website"
            type="url"
            placeholder="https://…"
            defaultValue=""
            className={INPUT_CLASS}
          />
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium text-text-primary">
          Contact Name
        </label>
        <input
          name="contactName"
          type="text"
          readOnly={lockContactFields}
          defaultValue={deal?.contactName}
          className={`${INPUT_CLASS} ${lockContactFields ? "cursor-not-allowed bg-surface/80 text-text-secondary" : ""}`}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-text-primary">
          Contact Email
        </label>
        <input
          name="contactEmail"
          type="email"
          readOnly={lockContactFields}
          defaultValue={deal?.contactEmail}
          className={`${INPUT_CLASS} ${lockContactFields ? "cursor-not-allowed bg-surface/80 text-text-secondary" : ""}`}
        />
      </div>
      {lockContactFields && (
        <p className="sm:col-span-2 text-xs text-text-secondary">
          Contact details are tied to the lead. Edit them on the lead record.
        </p>
      )}
    </div>
  );
}

function ModalShell({
  id,
  title,
  onClose,
  children,
}: {
  id: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
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
        aria-labelledby={id}
      >
        <h2
          id={id}
          className="text-sm font-bold uppercase tracking-wider text-text-secondary"
        >
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

function draftDealFromLeadOption(o: LeadDealPickerOption): MockDeal {
  return {
    id: "",
    title: "",
    company: "",
    value: 0,
    stage: "prospect",
    contactName: o.name?.trim() ?? "",
    contactEmail: o.email?.trim() ?? "",
    createdAt: "",
    expectedClose: "",
  };
}

function CreateDealModal({
  leadOptions,
  onClose,
}: {
  leadOptions: LeadDealPickerOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [leadId, setLeadId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selected = leadOptions.find((o) => o.id === leadId);
  const selectableCount = leadOptions.filter((o) => !o.hasDeal).length;

  const canSubmit =
    Boolean(leadId) &&
    Boolean(selected) &&
    !selected?.hasDeal &&
    selectableCount > 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!leadId || !selected || selected.hasDeal) {
      setError("Select a lead that does not already have a deal.");
      return;
    }
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    const company = String(fd.get("company") ?? "").trim();
    const value = Number(fd.get("value")) || 0;
    const stage = String(fd.get("stage") ?? "prospect").trim();
    const expectedCloseRaw = String(fd.get("expectedClose") ?? "").trim();
    const contactEmailRaw = String(fd.get("contactEmail") ?? "").trim();
    const websiteRaw = String(fd.get("website") ?? "").trim();

    const res = await createDealRecord({
      leadId,
      title,
      company,
      value,
      stage,
      expectedClose: expectedCloseRaw || null,
      contactEmail: contactEmailRaw || selected.email?.trim() || null,
      website: websiteRaw || null,
    });
    setPending(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <ModalShell id="create-deal-title" title="Create deal" onClose={onClose}>
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}

        {leadOptions.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No leads yet. Add a lead first, then you can create a deal for them.
          </p>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Related lead
              </label>
              <select
                name="lead_id"
                required
                value={leadId}
                onChange={(e) => {
                  setLeadId(e.target.value);
                  setError(null);
                }}
                className={INPUT_CLASS}
              >
                <option value="">Select a lead…</option>
                {leadOptions.map((o) => (
                  <option key={o.id} value={o.id} disabled={o.hasDeal}>
                    {o.label}
                    {o.hasDeal ? " — already has deal" : ""}
                  </option>
                ))}
              </select>
            </div>

            {selectableCount === 0 && (
              <p className="text-sm text-text-secondary">
                Every lead already has a deal. Add a new lead or remove an
                existing deal first.
              </p>
            )}

            {selected && !selected.hasDeal && (
              <DealFormFields
                key={selected.id}
                deal={draftDealFromLeadOption(selected)}
                lockContactFields
                includeWebsite
              />
            )}
          </>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={
              pending ||
              leadOptions.length === 0 ||
              selectableCount === 0 ||
              !canSubmit
            }
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create deal"}
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
    </ModalShell>
  );
}

function NewDealModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (deal: MockDeal) => void;
}) {
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const deal: MockDeal = {
      id: `d-${Date.now()}`,
      title: (fd.get("title") as string) || "Untitled Deal",
      company: (fd.get("company") as string) || "",
      value: Number(fd.get("value")) || 0,
      stage: (fd.get("stage") as DealStage) || "prospect",
      contactName: (fd.get("contactName") as string) || "",
      contactEmail: (fd.get("contactEmail") as string) || "",
      createdAt: new Date().toISOString().slice(0, 10),
      expectedClose: (fd.get("expectedClose") as string) || "",
    };
    onAdd(deal);
  }

  return (
    <ModalShell id="new-deal-title" title="New Deal" onClose={onClose}>
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <DealFormFields />
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Add deal
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
    </ModalShell>
  );
}

function EditDealModal({
  deal,
  lockContactFields,
  onClose,
  onSave,
  onDelete,
}: {
  deal: MockDeal;
  lockContactFields?: boolean;
  onClose: () => void;
  onSave: (
    updated: MockDeal
  ) => Promise<string | undefined> | string | undefined;
  onDelete: (id: string) => void | Promise<void>;
}) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const updated: MockDeal = {
      ...deal,
      title: (fd.get("title") as string) || deal.title,
      company: (fd.get("company") as string) || deal.company,
      value: Number(fd.get("value")) || deal.value,
      stage: (fd.get("stage") as DealStage) || deal.stage,
      contactName: (fd.get("contactName") as string) || deal.contactName,
      contactEmail: (fd.get("contactEmail") as string) || deal.contactEmail,
      expectedClose: (fd.get("expectedClose") as string) || deal.expectedClose,
    };
    setSaveError(null);
    setSaving(true);
    try {
      const err = await onSave(updated);
      if (typeof err === "string" && err) setSaveError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell id="edit-deal-title" title="Edit Deal" onClose={onClose}>
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        {saveError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {saveError}
          </p>
        )}
        <DealFormFields deal={deal} lockContactFields={lockContactFields} />
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-surface"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                !confirm(
                  "Delete this deal? This cannot be undone from here."
                )
              ) {
                return;
              }
              onDelete(deal.id);
            }}
            className="ml-auto rounded-xl px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            Delete
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
