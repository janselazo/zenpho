"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import { setCrmChildProjectTabGroup } from "@/app/(crm)/actions/projects";
import type { ProductChildRow } from "@/components/crm/product/ProductDetailShell";
import { PriorityFlagIcon } from "@/components/crm/product/PriorityFlagIcon";
import ProductChildDeliveryStatusModal from "@/components/crm/product/ProductChildDeliveryStatusModal";
import ProductCustomProjectStatusModal from "@/components/crm/product/ProductCustomProjectStatusModal";
import {
  resolveChildDeliveryPresentation,
  type ChildDeliveryStatusUiConfig,
} from "@/lib/crm/child-delivery-status-ui";
import {
  customStatusPresentation,
  isBuiltInTabGroupId,
  parseCustomProjectStatuses,
  resolveProjectsTabGroupId,
  type CustomProjectStatusRow,
} from "@/lib/crm/custom-project-status";
import {
  CHILD_PROJECT_GROUP_ORDER,
  CHILD_PROJECT_PRIORITY_LABELS,
  type ChildDeliveryStatus,
  parseChildProjectPriority,
  resolveChildDeliveryGroup,
} from "@/lib/crm/product-project-metadata";
import { getMemberById, getMembersForTeam, teamMembers } from "@/lib/crm/mock-data";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDashed,
  Clock,
  Layers,
  Pencil,
  Plus,
  UserPlus,
  XCircle,
} from "lucide-react";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseLeadId(metadata: unknown): string | null {
  if (!isRecord(metadata)) return null;
  const v = metadata.leadMemberId;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

const GROUP_ICON: Record<ChildDeliveryStatus, ReactNode> = {
  in_progress: <Clock className="h-3.5 w-3.5" aria-hidden />,
  planned: <Clock className="h-3.5 w-3.5" aria-hidden />,
  backlog: <Circle className="h-3.5 w-3.5" aria-hidden />,
  completed: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />,
  canceled: <XCircle className="h-3.5 w-3.5" aria-hidden />,
};

function RowStatusDot({
  status,
  accent,
}: {
  status: ChildDeliveryStatus;
  accent: string;
}) {
  switch (status) {
    case "backlog":
      return (
        <span className="flex h-6 w-6 items-center justify-center" aria-hidden>
          <CircleDashed className="h-4 w-4" style={{ color: accent }} />
        </span>
      );
    case "planned":
      return (
        <span className="flex h-6 w-6 items-center justify-center" aria-hidden>
          <Circle className="h-4 w-4" style={{ color: accent }} />
        </span>
      );
    case "in_progress":
      return (
        <span className="flex h-6 w-6 items-center justify-center" aria-hidden>
          <span className="relative flex h-4 w-4">
            <svg
              viewBox="0 0 16 16"
              className="h-4 w-4"
              style={{ color: accent }}
            >
              <circle
                cx="8"
                cy="8"
                r="6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M 8 2 A 6 6 0 0 1 8 14"
                fill="currentColor"
                opacity={0.55}
              />
            </svg>
          </span>
        </span>
      );
    case "completed":
      return (
        <span className="flex h-6 w-6 items-center justify-center" aria-hidden>
          <CheckCircle2 className="h-4 w-4" style={{ color: accent }} />
        </span>
      );
    case "canceled":
      return (
        <span className="flex h-6 w-6 items-center justify-center" aria-hidden>
          <XCircle className="h-4 w-4" style={{ color: accent }} />
        </span>
      );
    default:
      return null;
  }
}

function CustomColumnDot({ accent }: { accent: string }) {
  return (
    <span className="flex h-6 w-6 items-center justify-center" aria-hidden>
      <span
        className="h-3.5 w-3.5 rounded-full"
        style={{ backgroundColor: accent }}
      />
    </span>
  );
}

type GroupRow = {
  id: string;
  kind: "builtin" | "custom";
  builtinKey: ChildDeliveryStatus | null;
  custom: CustomProjectStatusRow | null;
  presentation: {
    label: string;
    labelUpper: string;
    color: string;
    foreground: string;
  };
  items: ProductChildRow[];
};

type Props = {
  productId: string;
  teamId: string;
  projects: ProductChildRow[];
  productMetadata: unknown;
  childDeliveryStatusUi: ChildDeliveryStatusUiConfig;
  onOpenProject: (childId: string) => void;
  onNewProject: (presetGroupId?: string) => void;
  onDeliveryStatusUiSaved: () => void;
  /** After changing a child’s status via the row icon */
  onChildDeliveryChanged?: () => void;
};

export default function ProductProjectsGroupedPanel({
  productId,
  teamId,
  projects,
  productMetadata,
  childDeliveryStatusUi,
  onOpenProject,
  onNewProject,
  onDeliveryStatusUiSaved,
  onChildDeliveryChanged,
}: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [cyclingId, setCyclingId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<ChildDeliveryStatus | null>(
    null
  );
  const [customModal, setCustomModal] = useState<
    | { mode: "create" }
    | { mode: "edit"; row: CustomProjectStatusRow }
    | null
  >(null);

  const members = useMemo(() => {
    const t = getMembersForTeam(teamId);
    return t.length > 0 ? t : teamMembers;
  }, [teamId]);

  const customStatuses = useMemo(
    () => parseCustomProjectStatuses(productMetadata),
    [productMetadata]
  );

  const customIdSet = useMemo(
    () => new Set(customStatuses.map((c) => c.id)),
    [customStatuses]
  );

  const customById = useMemo(() => {
    const m = new Map<string, CustomProjectStatusRow>();
    for (const c of customStatuses) m.set(c.id, c);
    return m;
  }, [customStatuses]);

  const groups = useMemo((): GroupRow[] => {
    const byId: Record<string, ProductChildRow[]> = {};
    for (const id of CHILD_PROJECT_GROUP_ORDER) {
      byId[id] = [];
    }
    for (const c of customStatuses) {
      byId[c.id] = [];
    }
    for (const p of projects) {
      const gid = resolveProjectsTabGroupId(
        p.metadata,
        p.plan_stage,
        customIdSet
      );
      if (byId[gid]) byId[gid].push(p);
      else {
        const fb = resolveChildDeliveryGroup(p.metadata, p.plan_stage);
        byId[fb].push(p);
      }
    }

    const builtIn: GroupRow[] = CHILD_PROJECT_GROUP_ORDER.map((id) => {
      const pres = resolveChildDeliveryPresentation(id, childDeliveryStatusUi);
      return {
        id,
        kind: "builtin",
        builtinKey: id,
        custom: null,
        presentation: {
          label: pres.label,
          labelUpper: pres.labelUpper,
          color: pres.color,
          foreground: pres.foreground,
        },
        items: byId[id] ?? [],
      };
    });

    const customRows: GroupRow[] = customStatuses.map((row) => {
      const pres = customStatusPresentation(row);
      return {
        id: row.id,
        kind: "custom",
        builtinKey: null,
        custom: row,
        presentation: {
          label: pres.label,
          labelUpper: pres.labelUpper,
          color: pres.color,
          foreground: pres.foreground,
        },
        items: byId[row.id] ?? [],
      };
    });

    return [...builtIn, ...customRows];
  }, [
    projects,
    childDeliveryStatusUi,
    customStatuses,
    customIdSet,
  ]);

  const cycleOrderIds = useMemo(() => groups.map((g) => g.id), [groups]);

  const cycleChildDeliveryStatus = useCallback(
    async (p: ProductChildRow) => {
      const current = resolveProjectsTabGroupId(
        p.metadata,
        p.plan_stage,
        customIdSet
      );
      let idx = cycleOrderIds.indexOf(current);
      if (idx < 0) idx = 0;
      const next = cycleOrderIds[(idx + 1) % cycleOrderIds.length];
      if (!next || next === current) return;
      setCyclingId(p.id);
      const res = await setCrmChildProjectTabGroup(productId, p.id, next);
      setCyclingId(null);
      if ("error" in res && res.error) {
        window.alert(res.error);
        return;
      }
      onChildDeliveryChanged?.();
    },
    [cycleOrderIds, customIdSet, productId, onChildDeliveryChanged]
  );

  function formatDue(iso: string | null | undefined) {
    const s = iso?.trim();
    if (!s) return null;
    try {
      return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(`${s}T12:00:00`));
    } catch {
      return s;
    }
  }

  function rowVisuals(p: ProductChildRow): {
    builtIn: ChildDeliveryStatus;
    accent: string;
    customDot: boolean;
  } {
    const tabId = resolveProjectsTabGroupId(
      p.metadata,
      p.plan_stage,
      customIdSet
    );
    const inferred = resolveChildDeliveryGroup(p.metadata, p.plan_stage);
    if (isBuiltInTabGroupId(tabId)) {
      return {
        builtIn: tabId,
        accent: resolveChildDeliveryPresentation(tabId, childDeliveryStatusUi)
          .color,
        customDot: false,
      };
    }
    const row = customById.get(tabId);
    const accent = row
      ? customStatusPresentation(row).color
      : "#71717a";
    return {
      builtIn: inferred,
      accent,
      customDot: true,
    };
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
          Project Features
        </h2>
        <button
          type="button"
          onClick={() => onNewProject(undefined)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white dark:bg-blue-600"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Project
        </button>
      </div>

      <div className="divide-y divide-border dark:divide-zinc-800/90">
        {groups.map((g) => {
          const isCollapsed = collapsed[g.id] === true;
          const pres = g.presentation;
          const count = g.items.length;
          return (
            <div key={g.id}>
              <div className="flex items-center gap-2 bg-surface/40 px-3 py-2 dark:bg-zinc-900/70">
                <button
                  type="button"
                  aria-expanded={!isCollapsed}
                  onClick={() =>
                    setCollapsed((c) => ({ ...c, [g.id]: !isCollapsed }))
                  }
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 shrink-0 text-text-secondary dark:text-zinc-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-text-secondary dark:text-zinc-500" />
                  )}
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide"
                    style={{
                      backgroundColor: pres.color,
                      color: pres.foreground,
                    }}
                  >
                    {g.kind === "builtin" && g.builtinKey
                      ? GROUP_ICON[g.builtinKey]
                      : (
                          <Layers className="h-3.5 w-3.5" aria-hidden />
                        )}
                    {pres.labelUpper}
                  </span>
                  <span className="text-xs text-text-secondary dark:text-zinc-500">
                    {count}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (g.kind === "builtin" && g.builtinKey) {
                      setEditingStatus(g.builtinKey);
                    } else if (g.custom) {
                      setCustomModal({ mode: "edit", row: g.custom });
                    }
                  }}
                  className="shrink-0 rounded-lg p-1.5 text-text-secondary hover:bg-white hover:text-text-primary dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  aria-label={`Edit name and color for ${pres.label}`}
                  title="Edit column"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => onNewProject(g.id)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium text-text-secondary hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Add project
                </button>
              </div>

              {!isCollapsed ? (
                <div>
                  <div className="grid grid-cols-[2rem_minmax(0,1fr)_7rem_7rem_5.5rem_2rem] gap-2 border-b border-border px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:border-zinc-800 dark:text-zinc-500">
                    <span />
                    <span>Name</span>
                    <span>Assignee</span>
                    <span>Due date</span>
                    <span>Priority</span>
                    <span className="text-center">
                      <Plus className="mx-auto h-3.5 w-3.5" aria-hidden />
                    </span>
                  </div>
                  <ul className="divide-y divide-border dark:divide-zinc-800/80">
                    {count === 0 ? (
                      <li className="px-4 py-8 text-center text-sm text-text-secondary dark:text-zinc-500">
                        No projects in this status.
                      </li>
                    ) : (
                      g.items.map((p) => {
                        const lead = parseLeadId(p.metadata);
                        const leadName = lead
                          ? getMemberById(lead)?.name ?? members.find((m) => m.id === lead)?.name
                          : null;
                        const priLevel = parseChildProjectPriority(p.metadata);
                        const priLabel = priLevel
                          ? CHILD_PROJECT_PRIORITY_LABELS[priLevel]
                          : null;
                        const due = formatDue(p.target_date);
                        const rv = rowVisuals(p);
                        return (
                          <li key={p.id}>
                            <div className="grid grid-cols-[2rem_minmax(0,1fr)_7rem_7rem_5.5rem_2rem] items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-surface/60 dark:hover:bg-zinc-900/80">
                              <button
                                type="button"
                                disabled={cyclingId === p.id}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  void cycleChildDeliveryStatus(p);
                                }}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-border/50 disabled:opacity-50 dark:hover:bg-zinc-800"
                                title="Change status"
                                aria-label="Change project status"
                              >
                                {rv.customDot ? (
                                  <CustomColumnDot accent={rv.accent} />
                                ) : (
                                  <RowStatusDot
                                    status={rv.builtIn}
                                    accent={rv.accent}
                                  />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenProject(p.id)}
                                className="col-span-5 grid grid-cols-[minmax(0,1fr)_7rem_7rem_5.5rem_2rem] items-center gap-2 text-left"
                              >
                                <span className="min-w-0 truncate font-medium text-text-primary dark:text-zinc-100">
                                  {p.title}
                                </span>
                                <span className="flex items-center justify-center text-text-secondary dark:text-zinc-500">
                                  {leadName ? (
                                    <span className="truncate text-xs">
                                      {leadName}
                                    </span>
                                  ) : (
                                    <UserPlus className="h-4 w-4 opacity-50" aria-hidden />
                                  )}
                                </span>
                                <span className="flex items-center justify-center text-text-secondary dark:text-zinc-500">
                                  {due ? (
                                    <span className="truncate text-xs">{due}</span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 text-xs opacity-50">
                                      <Calendar className="h-3.5 w-3.5" />
                                      <Plus className="h-3 w-3" />
                                    </span>
                                  )}
                                </span>
                                <span className="flex items-center justify-center text-text-secondary dark:text-zinc-500">
                                  {priLevel ? (
                                    <span className="inline-flex items-center gap-1 text-xs">
                                      <PriorityFlagIcon level={priLevel} />
                                      <span className="text-text-primary dark:text-zinc-200">
                                        {priLabel}
                                      </span>
                                    </span>
                                  ) : (
                                    <PriorityFlagIcon
                                      level=""
                                      className="h-4 w-4 opacity-50"
                                    />
                                  )}
                                </span>
                                <span className="flex justify-center text-text-secondary opacity-40 dark:text-zinc-500">
                                  <Plus className="h-4 w-4" aria-hidden />
                                </span>
                              </button>
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="border-t border-border p-2 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setCustomModal({ mode: "create" })}
          className="w-full rounded-lg border border-dashed border-border py-2.5 text-sm text-text-secondary transition-colors hover:border-accent/40 hover:bg-surface/40 hover:text-text-primary dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
        >
          + New status
        </button>
      </div>

      <ProductChildDeliveryStatusModal
        productId={productId}
        open={editingStatus !== null}
        statusId={editingStatus}
        statusUi={childDeliveryStatusUi}
        onClose={() => setEditingStatus(null)}
        onSaved={onDeliveryStatusUiSaved}
      />

      <ProductCustomProjectStatusModal
        productId={productId}
        open={customModal !== null}
        mode={customModal?.mode ?? "create"}
        initial={
          customModal?.mode === "edit" ? customModal.row : null
        }
        onClose={() => setCustomModal(null)}
        onSaved={onDeliveryStatusUiSaved}
      />
    </section>
  );
}
