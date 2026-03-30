"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  Pencil,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import PipelineSettingsModal from "@/components/crm/PipelineSettingsModal";
import CrmPopoverDateField from "@/components/crm/CrmPopoverDateField";
import {
  createDealRecord,
  deleteDealRecord,
  updateDealRecord,
} from "@/app/(crm)/actions/crm";
import type { LeadDealPickerOption } from "@/lib/crm/fetch-leads-for-deal-picker";
import { type MockDeal, type DealStage } from "@/lib/crm/mock-data";
import {
  dealStageLabelColor,
  type PipelineColumnDef,
} from "@/lib/crm/pipeline-columns";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string) {
  if (!iso?.trim()) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Stable pastel avatar styles for deal initials (distinct from stage badges). */
const DEAL_AVATAR_CLASSES = [
  "bg-sky-100 text-sky-800 ring-1 ring-sky-200/90 dark:bg-sky-500/20 dark:text-sky-100 dark:ring-sky-400/35",
  "bg-violet-100 text-violet-800 ring-1 ring-violet-200/90 dark:bg-violet-500/20 dark:text-violet-100 dark:ring-violet-400/35",
  "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/90 dark:bg-emerald-500/20 dark:text-emerald-100 dark:ring-emerald-400/35",
  "bg-amber-100 text-amber-900 ring-1 ring-amber-200/90 dark:bg-amber-500/20 dark:text-amber-50 dark:ring-amber-400/35",
  "bg-rose-100 text-rose-800 ring-1 ring-rose-200/90 dark:bg-rose-500/20 dark:text-rose-100 dark:ring-rose-400/35",
  "bg-cyan-100 text-cyan-900 ring-1 ring-cyan-200/90 dark:bg-cyan-500/20 dark:text-cyan-100 dark:ring-cyan-400/35",
  "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200/90 dark:bg-indigo-500/20 dark:text-indigo-100 dark:ring-indigo-400/35",
  "bg-fuchsia-100 text-fuchsia-800 ring-1 ring-fuchsia-200/90 dark:bg-fuchsia-500/20 dark:text-fuchsia-100 dark:ring-fuchsia-400/35",
] as const;

function dealAvatarClasses(dealId: string): string {
  let h = 0;
  for (let i = 0; i < dealId.length; i++) {
    h = (Math.imul(31, h) + dealId.charCodeAt(i)) | 0;
  }
  return DEAL_AVATAR_CLASSES[Math.abs(h) % DEAL_AVATAR_CLASSES.length];
}

export default function DealsView({
  deals,
  persistDeals = false,
  leadPickerOptions = [],
  dealPipelineColumns,
}: {
  deals: MockDeal[];
  persistDeals?: boolean;
  leadPickerOptions?: LeadDealPickerOption[];
  dealPipelineColumns: PipelineColumnDef[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [localDeals, setLocalDeals] = useState<MockDeal[]>(deals);
  const [dealPipeline, setDealPipeline] =
    useState<PipelineColumnDef[]>(dealPipelineColumns);
  const [pipelineSettingsOpen, setPipelineSettingsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [createDealOpen, setCreateDealOpen] = useState(false);
  const [editing, setEditing] = useState<MockDeal | null>(null);
  useEffect(() => {
    setLocalDeals(deals);
  }, [deals]);

  useEffect(() => {
    setDealPipeline(dealPipelineColumns.map((c) => ({ ...c })));
  }, [dealPipelineColumns]);

  const filtered = localDeals.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.company.toLowerCase().includes(q) ||
      d.contactName.toLowerCase().includes(q)
    );
  });

  const dealStageCounts = localDeals.reduce<Record<string, number>>((acc, d) => {
    acc[d.stage] = (acc[d.stage] ?? 0) + 1;
    return acc;
  }, {});

  const totalValue = filtered.reduce((sum, d) => sum + d.value, 0);

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
      website: updated.website?.trim() || null,
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
            Track deals from first touch to close
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

      {/* Stats + pipeline settings */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <span className="text-sm text-text-secondary">
          {filtered.length} deals · {formatCurrency(totalValue)} total
        </span>
        {persistDeals && (
          <button
            type="button"
            onClick={() => setPipelineSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:border-accent hover:text-accent dark:border-zinc-600"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Pipeline stages
          </button>
        )}
      </div>

      <div className="mt-6">
        <DealsTable
          deals={filtered}
          dealPipeline={dealPipeline}
          lockContactFields={persistDeals}
          persistDeals={persistDeals}
          onSaveDeal={async (updated) => {
            if (persistDeals) return handlePersistSave(updated);
            handleLocalSave(updated);
            return undefined;
          }}
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
      </div>

      {modalOpen && (
        <NewDealModal
          dealPipeline={dealPipeline}
          onClose={() => setModalOpen(false)}
          onAdd={(deal) => {
            setLocalDeals((prev) => [deal, ...prev]);
            setModalOpen(false);
          }}
        />
      )}

      {createDealOpen && (
        <CreateDealModal
          dealPipeline={dealPipeline}
          leadOptions={leadPickerOptions}
          onClose={() => setCreateDealOpen(false)}
        />
      )}

      {editing && (
        <EditDealModal
          deal={editing}
          dealPipeline={dealPipeline}
          lockContactFields={persistDeals}
          includeWebsite={persistDeals}
          onClose={() => setEditing(null)}
          onSave={async (updated) => {
            if (persistDeals) return handlePersistSave(updated);
            handleLocalSave(updated);
            return undefined;
          }}
          onDelete={handleDelete}
        />
      )}

      {persistDeals && (
        <PipelineSettingsModal
          open={pipelineSettingsOpen}
          onClose={() => setPipelineSettingsOpen(false)}
          kind="deal"
          columns={dealPipeline}
          stageCounts={dealStageCounts}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}

const tableCellInputClass =
  "w-full min-w-0 rounded-lg border border-border bg-white px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

const iconActionClass =
  "inline-flex shrink-0 items-center justify-center rounded-lg p-2 transition-colors disabled:opacity-50";

function DealsTable({
  deals,
  dealPipeline,
  lockContactFields,
  persistDeals,
  onSaveDeal,
  onDelete,
}: {
  deals: MockDeal[];
  dealPipeline: PipelineColumnDef[];
  lockContactFields: boolean;
  persistDeals: boolean;
  onSaveDeal: (updated: MockDeal) => Promise<string | undefined>;
  onDelete: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MockDeal | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingId && !deals.some((d) => d.id === editingId)) {
      setEditingId(null);
      setDraft(null);
      setSaveError(null);
    }
  }, [deals, editingId]);

  function patchDraft(patch: Partial<MockDeal>) {
    setDraft((d) => (d ? { ...d, ...patch } : null));
  }

  function startEdit(deal: MockDeal) {
    setSaveError(null);
    setEditingId(deal.id);
    setDraft({ ...deal });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
    setSaveError(null);
  }

  async function commitEdit() {
    if (!draft) return;
    setSaving(true);
    setSaveError(null);
    const err = await onSaveDeal(draft);
    setSaving(false);
    if (err) {
      setSaveError(err);
      return;
    }
    setEditingId(null);
    setDraft(null);
  }

  if (deals.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white py-16 text-center text-sm text-text-secondary">
        No deals found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
      {saveError ? (
        <div
          className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {saveError}
        </div>
      ) : null}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border dark:border-zinc-700">
            <th className="px-4 py-3 font-semibold text-text-secondary">Deal</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Company</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Budget</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Stage</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Contact</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Expected Close</th>
            <th className="px-4 py-3 font-semibold text-text-secondary">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border dark:divide-zinc-700">
          {deals.map((deal) => {
            const isEditing = editingId === deal.id;
            const rowCompany = isEditing && draft ? draft.company : deal.company;
            const initials = rowCompany
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <DealsTableRow
                key={deal.id}
                deal={deal}
                dealPipeline={dealPipeline}
                isEditing={isEditing}
                draft={draft}
                patchDraft={patchDraft}
                initials={initials}
                lockContactFields={lockContactFields}
                saving={saving}
                onStartEdit={() => startEdit(deal)}
                onCancelEdit={cancelEdit}
                onCommitEdit={() => void commitEdit()}
                onDelete={() => onDelete(deal.id)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DealsTableRow({
  deal,
  dealPipeline,
  isEditing,
  draft,
  patchDraft,
  initials,
  lockContactFields,
  saving,
  onStartEdit,
  onCancelEdit,
  onCommitEdit,
  onDelete,
}: {
  deal: MockDeal;
  dealPipeline: PipelineColumnDef[];
  isEditing: boolean;
  draft: MockDeal | null;
  patchDraft: (patch: Partial<MockDeal>) => void;
  initials: string;
  lockContactFields: boolean;
  saving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onCommitEdit: () => void;
  onDelete: () => void;
}) {
  const expectedCloseId = useId();

  return (
    <tr className="transition-colors hover:bg-surface/50 dark:hover:bg-zinc-900/40">
      <td className="px-4 py-3 align-top">
        <div className="flex items-start gap-2.5">
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${dealAvatarClasses(deal.id)}`}
          >
            {initials}
          </span>
          {isEditing && draft ? (
            <input
              type="text"
              value={draft.title}
              onChange={(e) => patchDraft({ title: e.target.value })}
              className={`${tableCellInputClass} min-w-[10rem]`}
              aria-label="Deal title"
            />
          ) : (
            <span className="pt-1.5 font-medium text-text-primary dark:text-zinc-100">
              {deal.title}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        {isEditing && draft ? (
          <input
            type="text"
            value={draft.company}
            onChange={(e) => patchDraft({ company: e.target.value })}
            className={tableCellInputClass}
            aria-label="Company"
          />
        ) : (
          <span className="text-text-secondary dark:text-zinc-400">
            {deal.company}
          </span>
        )}
      </td>
      <td className="max-w-[7rem] px-4 py-3 align-top">
        {isEditing && draft ? (
          <input
            type="number"
            min={0}
            value={draft.value}
            onChange={(e) =>
              patchDraft({ value: Number(e.target.value) || 0 })
            }
            className={tableCellInputClass}
            aria-label="Budget"
          />
        ) : (
          <span className="font-medium text-text-primary dark:text-zinc-100">
            {formatCurrency(deal.value)}
          </span>
        )}
      </td>
      <td className="min-w-[9.5rem] px-4 py-3 align-top">
        {isEditing && draft ? (
          <select
            value={draft.stage}
            onChange={(e) =>
              patchDraft({ stage: e.target.value as DealStage })
            }
            className={tableCellInputClass}
            aria-label="Stage"
          >
            {(dealPipeline.some((c) => c.slug === draft.stage)
              ? dealPipeline
              : [
                  ...dealPipeline,
                  {
                    slug: draft.stage,
                    label: `${draft.stage} (legacy)`,
                    color: "#64748b",
                  },
                ]
            ).map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-zinc-800 dark:text-zinc-200">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: dealStageLabelColor(deal.stage, dealPipeline)
                  .color,
              }}
            />
            {dealStageLabelColor(deal.stage, dealPipeline).label}
          </span>
        )}
      </td>
      <td className="min-w-[10rem] px-4 py-3 align-top">
        {isEditing && draft ? (
          lockContactFields ? (
            <div className="pt-1">
              <p className="text-text-primary dark:text-zinc-100">
                {draft.contactName}
              </p>
              <p className="text-xs text-text-secondary dark:text-zinc-400">
                {draft.contactEmail}
              </p>
              <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
                Edit contact on the lead record.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <input
                type="text"
                value={draft.contactName}
                onChange={(e) => patchDraft({ contactName: e.target.value })}
                className={tableCellInputClass}
                aria-label="Contact name"
              />
              <input
                type="email"
                value={draft.contactEmail}
                onChange={(e) => patchDraft({ contactEmail: e.target.value })}
                className={tableCellInputClass}
                aria-label="Contact email"
              />
            </div>
          )
        ) : (
          <div>
            <p className="text-text-primary dark:text-zinc-100">
              {deal.contactName}
            </p>
            <p className="text-xs text-text-secondary dark:text-zinc-400">
              {deal.contactEmail}
            </p>
          </div>
        )}
      </td>
      <td className="min-w-[9rem] px-4 py-3 align-top">
        {isEditing && draft ? (
          <CrmPopoverDateField
            id={expectedCloseId}
            value={draft.expectedClose}
            onChange={(iso) => patchDraft({ expectedClose: iso })}
            displayFormat="numeric"
            triggerClassName={`${tableCellInputClass} relative flex min-h-[2.25rem] items-center text-left`}
          />
        ) : (
          <span className="text-text-secondary dark:text-zinc-400">
            {formatDate(deal.expectedClose)}
          </span>
        )}
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex flex-wrap items-center gap-1">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={onCommitEdit}
                disabled={saving}
                className={`${iconActionClass} text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50`}
                aria-label="Save changes"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Check className="h-4 w-4" aria-hidden />
                )}
              </button>
              <button
                type="button"
                onClick={onCancelEdit}
                disabled={saving}
                className={`${iconActionClass} text-text-secondary hover:bg-surface dark:hover:bg-zinc-800`}
                aria-label="Cancel editing"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onStartEdit}
                className={`${iconActionClass} text-accent hover:bg-accent/10`}
                aria-label="Edit deal"
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={saving}
            className={`${iconActionClass} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40`}
            aria-label="Delete deal"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </td>
    </tr>
  );
}

const INPUT_CLASS =
  "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/15";

function DealFormFields({
  deal,
  dealPipeline,
  lockContactFields,
  includeWebsite,
}: {
  deal?: MockDeal;
  dealPipeline: PipelineColumnDef[];
  lockContactFields?: boolean;
  includeWebsite?: boolean;
}) {
  const expectedCloseId = useId();
  const [expectedClose, setExpectedClose] = useState(
    () => deal?.expectedClose ?? ""
  );
  useEffect(() => {
    setExpectedClose(deal?.expectedClose ?? "");
  }, [deal?.expectedClose, deal?.id]);

  const stageOptions =
    deal?.stage &&
    !dealPipeline.some((c) => c.slug === deal.stage)
      ? [
          ...dealPipeline,
          {
            slug: deal.stage,
            label: `${deal.stage} (legacy)`,
            color: "#64748b",
          },
        ]
      : dealPipeline;

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
          defaultValue={deal?.stage ?? dealPipeline[0]?.slug ?? "prospect"}
          className={INPUT_CLASS}
        >
          {stageOptions.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor={expectedCloseId}
          className="mb-1 block text-sm font-medium text-text-primary"
        >
          Expected Close
        </label>
        <input type="hidden" name="expectedClose" value={expectedClose} />
        <CrmPopoverDateField
          id={expectedCloseId}
          value={expectedClose}
          onChange={setExpectedClose}
          displayFormat="numeric"
          triggerClassName={`${INPUT_CLASS} relative flex min-h-[2.625rem] items-center text-left`}
        />
      </div>
      {includeWebsite && (
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-text-primary">
            Website
          </label>
          <input
            name="website"
            type="text"
            inputMode="url"
            autoComplete="url"
            placeholder="example.com or https://…"
            defaultValue={deal?.website ?? ""}
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
  dealPipeline,
  leadOptions,
  onClose,
}: {
  dealPipeline: PipelineColumnDef[];
  leadOptions: LeadDealPickerOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [leadId, setLeadId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selected = leadOptions.find((o) => o.id === leadId);

  const canSubmit = Boolean(leadId) && Boolean(selected);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!leadId || !selected) {
      setError("Select a lead.");
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
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {selected && (
              <DealFormFields
                key={selected.id}
                deal={draftDealFromLeadOption(selected)}
                dealPipeline={dealPipeline}
                lockContactFields
                includeWebsite
              />
            )}
          </>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={pending || leadOptions.length === 0 || !canSubmit}
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
  dealPipeline,
  onClose,
  onAdd,
}: {
  dealPipeline: PipelineColumnDef[];
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
        <DealFormFields dealPipeline={dealPipeline} />
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
  dealPipeline,
  lockContactFields,
  includeWebsite,
  onClose,
  onSave,
  onDelete,
}: {
  deal: MockDeal;
  dealPipeline: PipelineColumnDef[];
  lockContactFields?: boolean;
  includeWebsite?: boolean;
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
    const websiteRaw = String(fd.get("website") ?? "").trim();
    const updated: MockDeal = {
      ...deal,
      title: (fd.get("title") as string) || deal.title,
      company: (fd.get("company") as string) || deal.company,
      value: Number(fd.get("value")) || deal.value,
      stage: (fd.get("stage") as DealStage) || deal.stage,
      contactName: (fd.get("contactName") as string) || deal.contactName,
      contactEmail: (fd.get("contactEmail") as string) || deal.contactEmail,
      expectedClose: (fd.get("expectedClose") as string) || deal.expectedClose,
      website: includeWebsite ? websiteRaw || null : deal.website ?? null,
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
        <DealFormFields
          deal={deal}
          dealPipeline={dealPipeline}
          lockContactFields={lockContactFields}
          includeWebsite={includeWebsite}
        />
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
