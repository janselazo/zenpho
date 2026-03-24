"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  FolderKanban,
  ListTodo,
  Loader2,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import KanbanBoard, { type KanbanColumn } from "@/components/crm/KanbanBoard";
import CrmPopoverDateField from "@/components/crm/CrmPopoverDateField";
import CrmQuickTaskModal from "@/components/crm/CrmQuickTaskModal";
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
  if (!iso?.trim()) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function dealQuickTaskContextLabel(deal: MockDeal): string {
  return (
    deal.contactName?.trim() ||
    deal.contactEmail?.trim() ||
    deal.title?.trim() ||
    deal.company?.trim() ||
    "this deal"
  );
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
  const [quickTaskDeal, setQuickTaskDeal] = useState<MockDeal | null>(null);

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
            lockContactFields={persistDeals}
            persistDeals={persistDeals}
            onCreateProject={(dealId) => {
              router.push(
                `/projects?new=1&dealId=${encodeURIComponent(dealId)}`
              );
            }}
            onQuickTask={setQuickTaskDeal}
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
        )}
        {view === "pipeline" && (
          <KanbanBoard
            columns={kanbanColumns}
            onMove={handleMove}
            emptyColumnLabel="No deals"
            renderCard={(deal) => {
              const stopDragMouseDown = (e: React.MouseEvent) => {
                e.stopPropagation();
              };
              const taskLabel =
                deal.title?.trim() || deal.company?.trim() || "this deal";
              return (
                <div className="flex flex-col rounded-xl border border-border bg-white shadow-sm transition-shadow hover:shadow-md">
                  <button
                    type="button"
                    onClick={() => setEditing(deal)}
                    className="w-full p-3 text-left"
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
                  {persistDeals ? (
                    <div
                      className="flex items-center gap-1 border-t border-border px-2 py-2 dark:border-zinc-700"
                      onMouseDown={stopDragMouseDown}
                    >
                      <button
                        type="button"
                        onClick={() => setQuickTaskDeal(deal)}
                        disabled={!deal.leadId}
                        title={
                          deal.leadId
                            ? "Quick task"
                            : "Quick tasks need a linked lead"
                        }
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        aria-label={`Add task for ${taskLabel}`}
                      >
                        <ListTodo className="h-4 w-4 shrink-0" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/projects?new=1&dealId=${encodeURIComponent(deal.id)}`
                          )
                        }
                        title="Create project from deal"
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-violet-600 transition-colors hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/40"
                        aria-label={`Create project for ${taskLabel}`}
                      >
                        <FolderKanban
                          className="h-4 w-4 shrink-0"
                          aria-hidden
                        />
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            }}
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

      {quickTaskDeal?.leadId ? (
        <CrmQuickTaskModal
          leadId={quickTaskDeal.leadId}
          contextLabel={dealQuickTaskContextLabel(quickTaskDeal)}
          resetKey={quickTaskDeal.id}
          onClose={() => setQuickTaskDeal(null)}
        />
      ) : null}
    </div>
  );
}

const tableCellInputClass =
  "w-full min-w-0 rounded-lg border border-border bg-white px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

const iconActionClass =
  "inline-flex shrink-0 items-center justify-center rounded-lg p-2 transition-colors disabled:opacity-50";

function DealsTable({
  deals,
  lockContactFields,
  persistDeals,
  onCreateProject,
  onQuickTask,
  onSaveDeal,
  onDelete,
}: {
  deals: MockDeal[];
  lockContactFields: boolean;
  persistDeals: boolean;
  onCreateProject: (dealId: string) => void;
  onQuickTask: (deal: MockDeal) => void;
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
                isEditing={isEditing}
                draft={draft}
                patchDraft={patchDraft}
                initials={initials}
                lockContactFields={lockContactFields}
                persistDeals={persistDeals}
                saving={saving}
                onStartEdit={() => startEdit(deal)}
                onCancelEdit={cancelEdit}
                onCommitEdit={() => void commitEdit()}
                onQuickTask={() => onQuickTask(deal)}
                onCreateProject={() => onCreateProject(deal.id)}
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
  isEditing,
  draft,
  patchDraft,
  initials,
  lockContactFields,
  persistDeals,
  saving,
  onStartEdit,
  onCancelEdit,
  onCommitEdit,
  onQuickTask,
  onCreateProject,
  onDelete,
}: {
  deal: MockDeal;
  isEditing: boolean;
  draft: MockDeal | null;
  patchDraft: (patch: Partial<MockDeal>) => void;
  initials: string;
  lockContactFields: boolean;
  persistDeals: boolean;
  saving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onCommitEdit: () => void;
  onQuickTask: () => void;
  onCreateProject: () => void;
  onDelete: () => void;
}) {
  const expectedCloseId = useId();
  const stageForBadge = isEditing && draft ? draft.stage : deal.stage;

  return (
    <tr className="transition-colors hover:bg-surface/50 dark:hover:bg-zinc-900/40">
      <td className="px-4 py-3 align-top">
        <div className="flex items-start gap-2.5">
          <span
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: DEAL_STAGE_COLORS[stageForBadge] }}
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
            {stageOrder.map((s) => (
              <option key={s} value={s}>
                {DEAL_STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        ) : (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${stageBgClasses[deal.stage]}`}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: DEAL_STAGE_COLORS[deal.stage] }}
            />
            {DEAL_STAGE_LABELS[deal.stage]}
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
              {persistDeals ? (
                <button
                  type="button"
                  onClick={onQuickTask}
                  disabled={saving || !deal.leadId}
                  title={
                    deal.leadId
                      ? "Quick task"
                      : "Quick tasks need a linked lead"
                  }
                  className={`${iconActionClass} text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed dark:text-zinc-400 dark:hover:bg-zinc-800`}
                  aria-label={`Add task for ${deal.title?.trim() || deal.company || "deal"}`}
                >
                  <ListTodo className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
              {persistDeals ? (
                <button
                  type="button"
                  onClick={onCreateProject}
                  disabled={saving}
                  title="Create project from deal"
                  className={`${iconActionClass} text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/40`}
                  aria-label={`Create project for ${deal.title?.trim() || deal.company || "deal"}`}
                >
                  <FolderKanban className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
            </>
          ) : (
            <>
              {persistDeals ? (
                <button
                  type="button"
                  onClick={onQuickTask}
                  disabled={!deal.leadId}
                  title={
                    deal.leadId
                      ? "Quick task"
                      : "Quick tasks need a linked lead"
                  }
                  className={`${iconActionClass} text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed dark:text-zinc-400 dark:hover:bg-zinc-800`}
                  aria-label={`Add task for ${deal.title?.trim() || deal.company || "deal"}`}
                >
                  <ListTodo className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
              <button
                type="button"
                onClick={onStartEdit}
                className={`${iconActionClass} text-accent hover:bg-accent/10`}
                aria-label="Edit deal"
              >
                <Pencil className="h-4 w-4" aria-hidden />
              </button>
              {persistDeals ? (
                <button
                  type="button"
                  onClick={onCreateProject}
                  title="Create project from deal"
                  className={`${iconActionClass} text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/40`}
                  aria-label={`Create project for ${deal.title?.trim() || deal.company || "deal"}`}
                >
                  <FolderKanban className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
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
  lockContactFields,
  includeWebsite,
}: {
  deal?: MockDeal;
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
