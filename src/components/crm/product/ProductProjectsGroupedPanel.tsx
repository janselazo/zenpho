"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  deleteCrmProject,
  setCrmChildProjectTabGroup,
  updateCrmChildProjectQuickFields,
} from "@/app/(crm)/actions/projects";
import type { ProductChildRow } from "@/components/crm/product/ProductDetailShell";
import CrmPopoverDateField from "@/components/crm/CrmPopoverDateField";
import { PriorityFlagIcon } from "@/components/crm/product/PriorityFlagIcon";
import { ProductRowAssigneePicker } from "@/components/crm/product/ProductRowAssigneePicker";
import ProductChildDeliveryStatusModal from "@/components/crm/product/ProductChildDeliveryStatusModal";
import ProductChildDeliveryStatusesBulkModal from "@/components/crm/product/ProductChildDeliveryStatusesBulkModal";
import ProductChildProjectStatusMenu from "@/components/crm/product/ProductChildProjectStatusMenu";
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
  type ChildProjectPriority,
  parseChildProjectPriority,
  resolveChildDeliveryGroup,
} from "@/lib/crm/product-project-metadata";
import { useCrmTeamMembers } from "@/lib/crm/use-crm-team-members";
import {
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDashed,
  Clock,
  Eye,
  Layers,
  Pencil,
  Plus,
  Rocket,
  TestTube2,
  Trash2,
} from "lucide-react";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseLeadId(metadata: unknown): string | null {
  if (!isRecord(metadata)) return null;
  const v = metadata.leadMemberId;
  if (typeof v === "string" && v.trim()) return v.trim();
  const mids = metadata.memberIds;
  if (Array.isArray(mids)) {
    for (const x of mids) {
      if (typeof x === "string" && x.trim()) return x.trim();
    }
  }
  return null;
}

const GROUP_ICON: Record<ChildDeliveryStatus, ReactNode> = {
  backlog: <Circle className="h-3.5 w-3.5" aria-hidden />,
  planned: <Clock className="h-3.5 w-3.5" aria-hidden />,
  in_progress: <Clock className="h-3.5 w-3.5" aria-hidden />,
  in_review: <Eye className="h-3.5 w-3.5" aria-hidden />,
  testing: <TestTube2 className="h-3.5 w-3.5" aria-hidden />,
  production: <Rocket className="h-3.5 w-3.5" aria-hidden />,
};

const CHILD_PROJECT_PRIORITY_OPTIONS: {
  value: ChildProjectPriority;
  label: string;
}[] = [
  { value: "urgent", label: CHILD_PROJECT_PRIORITY_LABELS.urgent },
  { value: "high", label: CHILD_PROJECT_PRIORITY_LABELS.high },
  { value: "medium", label: CHILD_PROJECT_PRIORITY_LABELS.medium },
  { value: "low", label: CHILD_PROJECT_PRIORITY_LABELS.low },
];

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
    case "in_review":
      return (
        <span className="flex h-6 w-6 items-center justify-center" aria-hidden>
          <Eye className="h-4 w-4" style={{ color: accent }} />
        </span>
      );
    case "testing":
      return (
        <span className="flex h-6 w-6 items-center justify-center" aria-hidden>
          <TestTube2 className="h-4 w-4" style={{ color: accent }} />
        </span>
      );
    case "production":
      return (
        <span className="flex h-6 w-6 items-center justify-center" aria-hidden>
          <Rocket className="h-4 w-4" style={{ color: accent }} />
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
  /** When false, hides “Edit status columns” (e.g. Overview uses Settings for that). Default true. */
  showColumnEditor?: boolean;
  /** When true, only the header + footer (+ New status) render — for Settings. */
  toolbarOnly?: boolean;
  /** Hide the primary “+ Project” header button when using a global New Project control. */
  hideHeaderNewProjectButton?: boolean;
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
  showColumnEditor = true,
  toolbarOnly = false,
  hideHeaderNewProjectButton = false,
}: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [statusPicker, setStatusPicker] = useState<{
    child: ProductChildRow;
    anchor: HTMLElement;
  } | null>(null);
  const [statusApplying, setStatusApplying] = useState(false);
  const [editingStatus, setEditingStatus] = useState<ChildDeliveryStatus | null>(
    null
  );
  const [customModal, setCustomModal] = useState<
    | { mode: "create" }
    | { mode: "edit"; row: CustomProjectStatusRow }
    | null
  >(null);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);

  const roster = useCrmTeamMembers();
  const members = useMemo(() => {
    const label = (m: { id: string; name: string; email: string }) =>
      m.name.trim() || m.email.trim() || "Member";
    const pick = (list: typeof roster) =>
      list.map((m) => ({ id: m.id, name: label(m) }));
    const tid = teamId?.trim();
    if (tid && tid !== "team-general") {
      const onTeam = roster.filter((m) => m.teamId === tid);
      if (onTeam.length > 0) return pick(onTeam);
    }
    return pick(roster);
  }, [roster, teamId]);

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

  useEffect(() => {
    if (!columnMenuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!columnMenuRef.current?.contains(e.target as Node)) {
        setColumnMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [columnMenuOpen]);

  const statusMenuGroups = useMemo(
    () =>
      groups.map((g) => ({
        id: g.id,
        kind: g.kind,
        builtinKey: g.builtinKey,
        presentation: g.presentation,
      })),
    [groups]
  );

  const applyChildStatus = useCallback(
    async (childId: string, tabGroupId: string) => {
      setStatusApplying(true);
      const res = await setCrmChildProjectTabGroup(
        productId,
        childId,
        tabGroupId
      );
      setStatusApplying(false);
      if ("error" in res && res.error) {
        window.alert(res.error);
        return;
      }
      setStatusPicker(null);
      onChildDeliveryChanged?.();
    },
    [productId, onChildDeliveryChanged]
  );

  const updateChildQuickField = useCallback(
    async (
      childId: string,
      input: {
        leadMemberId?: string | null;
        target_date?: string | null;
        priority?: ChildProjectPriority | null;
      }
    ) => {
      setRowBusyId(childId);
      const res = await updateCrmChildProjectQuickFields(
        productId,
        childId,
        input
      );
      setRowBusyId(null);
      if ("error" in res && res.error) {
        window.alert(res.error);
        return;
      }
      onChildDeliveryChanged?.();
    },
    [productId, onChildDeliveryChanged]
  );

  const deleteChildProject = useCallback(
    async (child: ProductChildRow) => {
      const label = child.title.trim() || "this project";
      if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
      setRowBusyId(child.id);
      const res = await deleteCrmProject(child.id);
      setRowBusyId(null);
      if ("error" in res && res.error) {
        window.alert(res.error);
        return;
      }
      onChildDeliveryChanged?.();
    },
    [onChildDeliveryChanged]
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
    <section className="rounded-xl border border-border bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
          {toolbarOnly ? "Delivery status columns" : "Project Features"}
        </h2>
        <div className="flex shrink-0 items-center gap-1.5">
          {showColumnEditor ? (
          <div className="relative" ref={columnMenuRef}>
            <button
              type="button"
              onClick={() => setColumnMenuOpen((o) => !o)}
              aria-expanded={columnMenuOpen}
              aria-haspopup="menu"
              title="Edit status columns"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-surface/80 hover:text-text-primary dark:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Edit status columns</span>
            </button>
            {columnMenuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-[60] mt-1 min-w-[13rem] overflow-hidden rounded-xl border border-border bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-950"
              >
                <p className="border-b border-border px-3 py-2 text-xs text-text-secondary dark:border-zinc-800">
                  Edit column…
                </p>
                <button
                  role="menuitem"
                  type="button"
                  className="w-full border-b border-border px-3 py-2 text-left text-sm font-medium text-accent hover:bg-surface/80 dark:border-zinc-800 dark:text-blue-400 dark:hover:bg-zinc-800"
                  onClick={() => {
                    setColumnMenuOpen(false);
                    setBulkStatusModalOpen(true);
                  }}
                >
                  Customize names & colors…
                </button>
                {groups.map((g) => (
                  <button
                    key={g.id}
                    role="menuitem"
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-primary hover:bg-surface/80 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    onClick={() => {
                      setColumnMenuOpen(false);
                      if (g.kind === "builtin" && g.builtinKey) {
                        setEditingStatus(g.builtinKey);
                      } else if (g.custom) {
                        setCustomModal({ mode: "edit", row: g.custom });
                      }
                    }}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: g.presentation.color }}
                      aria-hidden
                    />
                    <span className="min-w-0 truncate">{g.presentation.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          ) : null}
          {!hideHeaderNewProjectButton ? (
          <button
            type="button"
            onClick={() => onNewProject(undefined)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white dark:bg-blue-600"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Project
          </button>
          ) : null}
        </div>
      </div>

      {!toolbarOnly ? (
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
              </div>

              {!isCollapsed ? (
                <div>
                  <div className="grid grid-cols-[2rem_minmax(0,1fr)_8rem_8rem_7rem_2rem] gap-2 border-b border-border px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-text-secondary dark:border-zinc-800 dark:text-zinc-500">
                    <span />
                    <span>Name</span>
                    <span>Assignee</span>
                    <span>Due date</span>
                    <span>Priority</span>
                    <span className="text-center" aria-hidden />
                  </div>
                  <ul className="divide-y divide-border dark:divide-zinc-800/80">
                    {count === 0 ? (
                      <li className="px-4 py-8 text-center text-sm text-text-secondary dark:text-zinc-500">
                        No projects in this status.
                      </li>
                    ) : (
                      g.items.map((p) => {
                        const lead = parseLeadId(p.metadata);
                        const priLevel = parseChildProjectPriority(p.metadata);
                        const priLabel = priLevel
                          ? CHILD_PROJECT_PRIORITY_LABELS[priLevel]
                          : null;
                        const due = formatDue(p.target_date);
                        const rv = rowVisuals(p);
                        return (
                          <li key={p.id}>
                            <div className="grid grid-cols-[2rem_minmax(0,1fr)_8rem_8rem_7rem_2rem] items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-surface/60 dark:hover:bg-zinc-900/80">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setStatusPicker({
                                    child: p,
                                    anchor: e.currentTarget,
                                  });
                                }}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-border/50 dark:hover:bg-zinc-800"
                                title="Change status"
                                aria-label="Change project status"
                                aria-haspopup="dialog"
                                aria-expanded={
                                  statusPicker?.child.id === p.id ? true : false
                                }
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
                                className="min-w-0 truncate rounded-md text-left font-medium text-text-primary hover:text-accent hover:underline dark:text-zinc-100"
                              >
                                {p.title}
                              </button>
                              <ProductRowAssigneePicker
                                memberId={lead}
                                members={members}
                                ariaSubject={p.title}
                                unassignedHint="Assign project"
                                disabled={rowBusyId === p.id}
                                onAssign={(id) =>
                                  void updateChildQuickField(p.id, {
                                    leadMemberId: id,
                                  })
                                }
                              />
                              <div
                                className="min-w-0"
                                title={due ? `Due ${due}` : "Set due date"}
                              >
                                <CrmPopoverDateField
                                  id={`product-child-due-${p.id}`}
                                  value={
                                    typeof p.target_date === "string"
                                      ? p.target_date.slice(0, 10)
                                      : ""
                                  }
                                  onChange={(v) =>
                                    void updateChildQuickField(p.id, {
                                      target_date: v.trim() ? v : null,
                                    })
                                  }
                                  displayFormat="numeric"
                                  compact
                                  showFooter
                                  showTriggerChevron
                                  emptyLabel="Due"
                                  disabled={rowBusyId === p.id}
                                  triggerClassName="!max-w-none w-full min-h-8"
                                  aria-label={`Due date for ${p.title}`}
                                />
                              </div>
                              <label
                                className={`relative flex h-8 min-w-0 cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-lg border px-2 text-xs font-medium transition-colors ${
                                  priLevel
                                    ? "border-border bg-white text-text-primary shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                                    : "border-transparent text-text-secondary hover:border-border hover:bg-white hover:text-text-primary dark:text-zinc-500 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
                                }`}
                                title={
                                  priLabel ? `Priority: ${priLabel}` : "Set priority"
                                }
                              >
                                <span className="pointer-events-none flex min-w-0 items-center gap-1.5">
                                  <PriorityFlagIcon
                                    level={priLevel ?? ""}
                                    className="h-4 w-4 shrink-0 opacity-80"
                                  />
                                  <span className="truncate">
                                    {priLabel ?? "Priority"}
                                  </span>
                                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                                </span>
                                <select
                                  value={priLevel ?? ""}
                                  disabled={rowBusyId === p.id}
                                  onChange={(e) =>
                                    void updateChildQuickField(p.id, {
                                      priority:
                                        (e.target.value as ChildProjectPriority) ||
                                        null,
                                    })
                                  }
                                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-wait"
                                  aria-label={`Priority for ${p.title}`}
                                >
                                  <option value="">Priority</option>
                                  {CHILD_PROJECT_PRIORITY_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <button
                                type="button"
                                disabled={rowBusyId === p.id}
                                onClick={() => void deleteChildProject(p)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary/70 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-wait disabled:opacity-50 dark:text-zinc-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                title="Delete project"
                                aria-label={`Delete ${p.title}`}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden />
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
      ) : null}

      {showColumnEditor ? (
      <div className="border-t border-border p-2 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setCustomModal({ mode: "create" })}
          className="w-full rounded-lg border border-dashed border-border py-2.5 text-sm text-text-secondary transition-colors hover:border-accent/40 hover:bg-surface/40 hover:text-text-primary dark:border-zinc-700 dark:text-zinc-500 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
        >
          + New status
        </button>
      </div>
      ) : null}

      {statusPicker ? (
        <ProductChildProjectStatusMenu
          open
          anchorEl={statusPicker.anchor}
          groups={statusMenuGroups}
          currentGroupId={resolveProjectsTabGroupId(
            statusPicker.child.metadata,
            statusPicker.child.plan_stage,
            customIdSet
          )}
          applying={statusApplying}
          onClose={() => {
            if (statusApplying) return;
            setStatusPicker(null);
          }}
          onSelect={(groupId) =>
            void applyChildStatus(statusPicker.child.id, groupId)
          }
        />
      ) : null}

      <ProductChildDeliveryStatusModal
        productId={productId}
        open={editingStatus !== null}
        statusId={editingStatus}
        statusUi={childDeliveryStatusUi}
        onClose={() => setEditingStatus(null)}
        onSaved={onDeliveryStatusUiSaved}
      />

      <ProductChildDeliveryStatusesBulkModal
        productId={productId}
        open={bulkStatusModalOpen}
        statusUi={childDeliveryStatusUi}
        onClose={() => setBulkStatusModalOpen(false)}
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
