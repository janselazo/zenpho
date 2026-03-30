"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { ProductChildRow } from "@/components/crm/product/ProductDetailShell";
import {
  CHILD_DELIVERY_STATUS_LABELS,
  CHILD_PROJECT_GROUP_ORDER,
  type ChildDeliveryStatus,
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
  Flag,
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

function parsePriorityLabel(metadata: unknown): string | null {
  if (!isRecord(metadata)) return null;
  const v = metadata.priority;
  if (v === "urgent") return "Urgent";
  if (v === "high") return "High";
  if (v === "medium") return "Medium";
  if (v === "low") return "Low";
  return null;
}

const GROUP_BADGE: Record<
  ChildDeliveryStatus,
  { className: string; icon: ReactNode }
> = {
  in_progress: {
    className:
      "bg-violet-600/85 text-white dark:bg-violet-600 dark:text-white",
    icon: <Clock className="h-3.5 w-3.5" aria-hidden />,
  },
  planned: {
    className:
      "bg-amber-500/90 text-amber-950 dark:bg-amber-500 dark:text-amber-950",
    icon: <Clock className="h-3.5 w-3.5" aria-hidden />,
  },
  backlog: {
    className: "bg-zinc-600 text-zinc-100 dark:bg-zinc-700 dark:text-zinc-200",
    icon: <Circle className="h-3.5 w-3.5" aria-hidden />,
  },
  completed: {
    className:
      "bg-emerald-600/90 text-white dark:bg-emerald-600 dark:text-white",
    icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />,
  },
  canceled: {
    className: "bg-zinc-500/80 text-white dark:bg-zinc-600 dark:text-zinc-100",
    icon: <XCircle className="h-3.5 w-3.5" aria-hidden />,
  },
};

function RowStatusDot({ status }: { status: ChildDeliveryStatus }) {
  switch (status) {
    case "backlog":
      return (
        <span className="flex h-6 w-6 items-center justify-center" aria-hidden>
          <CircleDashed className="h-4 w-4 text-zinc-500" />
        </span>
      );
    case "planned":
      return (
        <span className="flex h-6 w-6 items-center justify-center" aria-hidden>
          <Circle className="h-4 w-4 text-amber-500" />
        </span>
      );
    case "in_progress":
      return (
        <span className="flex h-6 w-6 items-center justify-center" aria-hidden>
          <span className="relative flex h-4 w-4">
            <svg viewBox="0 0 16 16" className="h-4 w-4 text-violet-500">
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
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        </span>
      );
    case "canceled":
      return (
        <span className="flex h-6 w-6 items-center justify-center" aria-hidden>
          <XCircle className="h-4 w-4 text-zinc-500" />
        </span>
      );
    default:
      return null;
  }
}

type Props = {
  teamId: string;
  projects: ProductChildRow[];
  onOpenProject: (childId: string) => void;
  onNewProject: (presetStatus?: ChildDeliveryStatus) => void;
};

export default function ProductProjectsGroupedPanel({
  teamId,
  projects,
  onOpenProject,
  onNewProject,
}: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const members = useMemo(() => {
    const t = getMembersForTeam(teamId);
    return t.length > 0 ? t : teamMembers;
  }, [teamId]);

  const groups = useMemo(() => {
    const by: Record<ChildDeliveryStatus, ProductChildRow[]> = {
      backlog: [],
      planned: [],
      in_progress: [],
      completed: [],
      canceled: [],
    };
    for (const p of projects) {
      const k = resolveChildDeliveryGroup(p.metadata, p.plan_stage);
      by[k].push(p);
    }
    return CHILD_PROJECT_GROUP_ORDER.map((id) => ({
      id,
      label: CHILD_DELIVERY_STATUS_LABELS[id].toUpperCase(),
      items: by[id],
    }));
  }, [projects]);

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

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
          Projects
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
          const badge = GROUP_BADGE[g.id];
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
                    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide ${badge.className}`}
                  >
                    {badge.icon}
                    {g.label}
                  </span>
                  <span className="text-xs text-text-secondary dark:text-zinc-500">
                    {count}
                  </span>
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
                        const pri = parsePriorityLabel(p.metadata);
                        const due = formatDue(p.target_date);
                        const statusKey = resolveChildDeliveryGroup(
                          p.metadata,
                          p.plan_stage
                        );
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => onOpenProject(p.id)}
                              className="grid w-full grid-cols-[2rem_minmax(0,1fr)_7rem_7rem_5.5rem_2rem] items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface/60 dark:hover:bg-zinc-900/80"
                            >
                              <RowStatusDot status={statusKey} />
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
                                {pri ? (
                                  <span className="inline-flex items-center gap-1 text-xs">
                                    <Flag className="h-3.5 w-3.5 opacity-70" />
                                    {pri}
                                  </span>
                                ) : (
                                  <Flag className="h-4 w-4 opacity-35" aria-hidden />
                                )}
                              </span>
                              <span className="flex justify-center text-text-secondary opacity-40 dark:text-zinc-500">
                                <Plus className="h-4 w-4" aria-hidden />
                              </span>
                            </button>
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
          disabled
          className="w-full rounded-lg border border-dashed border-border py-2.5 text-sm text-text-secondary opacity-60 dark:border-zinc-700 dark:text-zinc-500"
          title="Custom status columns are not configurable yet."
        >
          + New status
        </button>
      </div>
    </section>
  );
}
