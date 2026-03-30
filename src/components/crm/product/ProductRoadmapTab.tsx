"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Settings2 } from "lucide-react";
import { getMemberById } from "@/lib/crm/mock-data";
import { readStoredTeamMembers } from "@/lib/crm/team-members-storage";
import {
  addDays,
  daysBetween,
  formatISODate,
  parseISODate,
} from "@/lib/crm/project-date-utils";
import { useProjectWorkspace } from "@/lib/crm/use-project-workspace";
import type { WorkspaceSprint, WorkspaceTask } from "@/lib/crm/project-workspace-types";
import {
  childProjectStatusDisplay,
  parseProductMilestones,
  type ProductMilestoneMeta,
} from "@/lib/crm/product-project-metadata";

const DAY_WIDTH = 34;
const LEFT_W = 288;
const HEADER_H = 52;
const SPRINT_HEADER_H = 36;
const ROW_H = 56;

type ChildRow = {
  id: string;
  title: string;
  plan_stage: string | null;
  metadata: unknown;
  target_date?: string | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseLeadId(metadata: unknown): string | null {
  if (!isRecord(metadata)) return null;
  const v = metadata.leadMemberId;
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function milestoneInSprint(
  targetDate: string,
  sprint: WorkspaceSprint
): boolean {
  const t = parseISODate(targetDate.slice(0, 10));
  const a = parseISODate(sprint.startDate);
  const b = parseISODate(sprint.endDate);
  return t >= a && t <= b;
}

function assignFeatureToSprintKey(
  milestones: ProductMilestoneMeta[],
  sprints: WorkspaceSprint[]
): string {
  const dated = milestones.filter((m) => m.targetDate?.trim());
  if (sprints.length === 0) return "__all__";
  if (dated.length === 0) return "__backlog__";

  let bestIdx = -1;
  let bestCount = 0;
  for (let i = 0; i < sprints.length; i++) {
    const s = sprints[i];
    let c = 0;
    for (const m of dated) {
      if (milestoneInSprint(m.targetDate!, s)) c += 1;
    }
    if (c > bestCount) {
      bestCount = c;
      bestIdx = i;
    }
  }
  if (bestCount === 0) return "__backlog__";
  return sprints[bestIdx]!.id;
}

function featureBarRange(
  child: ChildRow,
  milestones: ProductMilestoneMeta[]
): { start: Date; end: Date } | null {
  const dated = milestones
    .map((m) => m.targetDate?.trim())
    .filter(Boolean) as string[];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (dated.length > 0) {
    const dates = dated.map((d) => parseISODate(d.slice(0, 10)));
    const start = new Date(Math.min(...dates.map((d) => d.getTime())));
    const end = new Date(Math.max(...dates.map((d) => d.getTime())));
    return { start, end };
  }

  const td = child.target_date?.trim();
  if (td) {
    const d = parseISODate(td.slice(0, 10));
    return { start: d, end: d };
  }
  return null;
}

function milestoneTaskProgress(
  milestoneId: string,
  tasks: WorkspaceTask[]
): number | null {
  const subset = tasks.filter((t) => t.productMilestoneId === milestoneId);
  if (subset.length === 0) return null;
  const done = subset.filter((t) => t.status === "completed").length;
  return Math.round((done / subset.length) * 100);
}

type RoadmapGroup =
  | { kind: "sprint"; sprint: WorkspaceSprint }
  | { kind: "backlog"; label: string }
  | { kind: "all"; label: string };

type Props = {
  productId: string;
  projectId: string;
  childrenProjects: ChildRow[];
};

export default function ProductRoadmapTab({
  productId,
  projectId,
  childrenProjects,
}: Props) {
  const { workspace, hydrated } = useProjectWorkspace(projectId);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [hovered, setHovered] = useState<{
    milestone: ProductMilestoneMeta;
    progress: number | null;
    tipX: number;
    tipY: number;
  } | null>(null);

  const sprintsSorted = useMemo(
    () =>
      [...workspace.sprints].sort(
        (a, b) =>
          parseISODate(a.startDate).getTime() -
          parseISODate(b.startDate).getTime()
      ),
    [workspace.sprints]
  );

  const featuresWithMeta = useMemo(
    () =>
      childrenProjects.map((c) => {
        const milestones = parseProductMilestones(c.metadata);
        return {
          child: c,
          milestones,
          bar: featureBarRange(c, milestones),
        };
      }),
    [childrenProjects]
  );

  const groups = useMemo(() => {
    const list: { group: RoadmapGroup; features: typeof featuresWithMeta }[] =
      [];

    if (sprintsSorted.length === 0) {
      list.push({
        group: { kind: "all", label: "Timeline" },
        features: featuresWithMeta,
      });
      return list;
    }

    const bySprint = new Map<string, typeof featuresWithMeta>();
    for (const s of sprintsSorted) {
      bySprint.set(s.id, []);
    }
    bySprint.set("__backlog__", []);

    for (const row of featuresWithMeta) {
      const key = assignFeatureToSprintKey(row.milestones, sprintsSorted);
      const bucket = bySprint.get(key);
      if (bucket) bucket.push(row);
      else bySprint.get("__backlog__")!.push(row);
    }

    for (const s of sprintsSorted) {
      const feats = bySprint.get(s.id) ?? [];
      list.push({ group: { kind: "sprint", sprint: s }, features: feats });
    }
    const backlog = bySprint.get("__backlog__") ?? [];
    if (backlog.length > 0) {
      list.push({
        group: { kind: "backlog", label: "Unscheduled" },
        features: backlog,
      });
    }
    return list;
  }, [featuresWithMeta, sprintsSorted]);

  const { rangeStart, totalDays, dayLabels, monthSpans } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let minT = addDays(today, -10);
    let maxT = addDays(today, 28);

    for (const s of sprintsSorted) {
      const a = parseISODate(s.startDate);
      const b = parseISODate(s.endDate);
      if (a < minT) minT = a;
      if (b > maxT) maxT = b;
    }
    for (const row of featuresWithMeta) {
      if (row.bar) {
        if (row.bar.start < minT) minT = row.bar.start;
        if (row.bar.end > maxT) maxT = row.bar.end;
      }
      for (const m of row.milestones) {
        if (!m.targetDate?.trim()) continue;
        const d = parseISODate(m.targetDate.slice(0, 10));
        if (d < minT) minT = d;
        if (d > maxT) maxT = d;
      }
    }

    minT = addDays(minT, -4);
    maxT = addDays(maxT, 8);
    const days = Math.max(21, daysBetween(minT, maxT) + 1);
    const labels = Array.from({ length: days }, (_, i) => {
      const d = addDays(minT, i);
      return { d, label: d.getDate() };
    });

    const monthSpans: { key: string; label: string; cols: number }[] = [];
    let i = 0;
    while (i < labels.length) {
      const monthKey = `${labels[i].d.getFullYear()}-${labels[i].d.getMonth()}`;
      const label = labels[i].d
        .toLocaleDateString("en-US", { month: "short" })
        .toUpperCase();
      let j = i + 1;
      while (
        j < labels.length &&
        `${labels[j].d.getFullYear()}-${labels[j].d.getMonth()}` === monthKey
      ) {
        j += 1;
      }
      monthSpans.push({ key: monthKey, label, cols: j - i });
      i = j;
    }

    return {
      rangeStart: minT,
      totalDays: days,
      dayLabels: labels,
      monthSpans,
    };
  }, [featuresWithMeta, sprintsSorted]);

  const timelineWidth = totalDays * DAY_WIDTH;
  const todayStr = formatISODate(new Date());
  const todayOffset = dayLabels.findIndex(
    ({ d }) => formatISODate(d) === todayStr
  );

  const members = readStoredTeamMembers();
  function resolveMember(assigneeId: string | null) {
    if (!assigneeId) return null;
    return (
      members.find((m) => m.id === assigneeId) ?? getMemberById(assigneeId)
    );
  }

  function toggleGroup(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const milestonesHref = `/products/${productId}?tab=milestones&project=${encodeURIComponent(projectId)}`;

  if (!hydrated) {
    return (
      <p className="text-sm text-text-secondary dark:text-zinc-400">
        Loading roadmap…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-text-primary dark:text-zinc-100">
          Roadmap
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={milestonesHref}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface/60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700/80"
          >
            <Settings2 className="h-3.5 w-3.5" aria-hidden />
            Edit milestones
          </Link>
        </div>
      </div>

      <p className="text-sm text-text-secondary dark:text-zinc-400">
        Delivery projects are grouped by sprint (from the project you selected
        above). Milestones with dates appear on each bar; dates outside every
        sprint land in Unscheduled.
      </p>

      <div className="flex overflow-hidden rounded-2xl border border-border bg-zinc-950 text-zinc-100 dark:border-zinc-700">
        <div
          className="shrink-0 border-r border-zinc-800 bg-zinc-900/90"
          style={{ width: LEFT_W }}
        >
          <div style={{ height: HEADER_H }} className="border-b border-zinc-800" />
          {groups.map(({ group, features }) => {
            const gid =
              group.kind === "sprint"
                ? `sprint-${group.sprint.id}`
                : group.kind === "backlog"
                  ? "backlog"
                  : "all";
            const isCollapsed = collapsed.has(gid);
            const label =
              group.kind === "sprint"
                ? `${group.sprint.name} · ${group.sprint.startDate} → ${group.sprint.endDate}`
                : group.label;

            return (
              <div key={gid}>
                <button
                  type="button"
                  onClick={() => toggleGroup(gid)}
                  className="flex w-full items-center gap-2 border-b border-zinc-800 px-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400 hover:bg-zinc-800/50"
                  style={{ height: SPRINT_HEADER_H }}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="min-w-0 truncate">{label}</span>
                </button>
                {!isCollapsed
                  ? features.map(({ child, milestones, bar }) => {
                      const lead = parseLeadId(child.metadata);
                      const m = resolveMember(lead);
                      const statusLabel = childProjectStatusDisplay(
                        child.metadata,
                        child.plan_stage
                      );
                      return (
                        <div
                          key={child.id}
                          className="flex items-center gap-2 border-b border-zinc-800/80 px-3"
                          style={{ height: ROW_H }}
                        >
                          <span className="h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-zinc-100">
                              {child.title}
                            </p>
                            {statusLabel ? (
                              <p className="truncate text-[10px] text-zinc-500">
                                {statusLabel}
                              </p>
                            ) : null}
                          </div>
                          {m ? (
                            <span
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-semibold text-zinc-200"
                              title={m.name}
                            >
                              {(m.avatarFallback ?? m.name).slice(0, 2)}
                            </span>
                          ) : (
                            <span className="h-6 w-6 shrink-0 rounded-full bg-zinc-800" />
                          )}
                        </div>
                      );
                    })
                  : null}
              </div>
            );
          })}
        </div>

        <div className="min-w-0 flex-1 overflow-x-auto bg-zinc-950">
          <div className="relative" style={{ width: timelineWidth }}>
            <div
              className="sticky left-0 z-10 border-b border-zinc-800 bg-zinc-900/95"
              style={{ height: HEADER_H }}
            >
              <div className="flex h-5 border-b border-zinc-800/80">
                {monthSpans.map((span) => (
                  <div
                    key={span.key}
                    className="flex items-center justify-center border-r border-zinc-800/60 text-[10px] font-semibold text-zinc-500"
                    style={{ width: span.cols * DAY_WIDTH }}
                  >
                    {span.label}
                  </div>
                ))}
              </div>
              <div className="flex h-[calc(100%-1.25rem)]">
                {dayLabels.map(({ d, label }, i) => {
                  const isToday = formatISODate(d) === todayStr;
                  return (
                    <div
                      key={i}
                      style={{ width: DAY_WIDTH }}
                      className={`flex shrink-0 flex-col items-center justify-end pb-1 text-xs ${
                        isToday ? "bg-violet-500/15" : ""
                      } border-r border-dotted border-zinc-800/50`}
                    >
                      <span className="font-medium text-zinc-300">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {todayOffset >= 0 && todayOffset < totalDays ? (
              <div
                className="pointer-events-none absolute z-20 w-px bg-violet-500"
                style={{
                  left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2,
                  top: HEADER_H,
                  bottom: 0,
                }}
              >
                <span className="absolute -top-1 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full bg-violet-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                  {new Date().getDate()}
                </span>
              </div>
            ) : null}

            {groups.map(({ group, features }) => {
              const gid =
                group.kind === "sprint"
                  ? `sprint-${group.sprint.id}`
                  : group.kind === "backlog"
                    ? "backlog"
                    : "all";
              const isCollapsed = collapsed.has(gid);

              return (
                <div key={`t-${gid}`}>
                  <div
                    className="border-b border-zinc-800 bg-zinc-900/40"
                    style={{ height: SPRINT_HEADER_H, width: timelineWidth }}
                  />
                  {!isCollapsed
                    ? features.map(({ child, milestones, bar }) => {
                        const barLeft = bar
                          ? Math.max(
                              0,
                              daysBetween(rangeStart, bar.start) * DAY_WIDTH
                            )
                          : 0;
                        const barEndDay = bar
                          ? daysBetween(rangeStart, bar.end) + 1
                          : 1;
                        const barStartDay = bar
                          ? daysBetween(rangeStart, bar.start)
                          : 0;
                        const spanDays = Math.max(
                          1,
                          barEndDay - barStartDay
                        );
                        const barWidth = Math.max(
                          spanDays * DAY_WIDTH - 6,
                          DAY_WIDTH * 0.75
                        );

                        const showBar = bar !== null;
                        const tasksForProgress =
                          child.id === projectId ? workspace.tasks : [];

                        return (
                          <div
                            key={child.id}
                            className="relative border-b border-zinc-800/80"
                            style={{ width: timelineWidth, height: ROW_H }}
                          >
                            {showBar ? (
                              <>
                                <div
                                  className="absolute top-2 h-7 rounded-md bg-zinc-800/90 ring-1 ring-zinc-700/80"
                                  style={{
                                    left: barLeft + 3,
                                    width: barWidth,
                                  }}
                                />
                                {milestones.map((ms, idx) => {
                                  if (!ms.targetDate?.trim()) return null;
                                  const md = parseISODate(
                                    ms.targetDate.slice(0, 10)
                                  );
                                  const dayIx = daysBetween(rangeStart, md);
                                  if (dayIx < 0 || dayIx >= totalDays)
                                    return null;
                                  const cx =
                                    dayIx * DAY_WIDTH + DAY_WIDTH / 2;
                                  const accent =
                                    idx === milestones.length - 1
                                      ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.35)]"
                                      : "bg-zinc-500";
                                  const progress = milestoneTaskProgress(
                                    ms.id,
                                    tasksForProgress
                                  );

                                  return (
                                    <div key={ms.id}>
                                      <button
                                        type="button"
                                        className={`absolute top-[17px] z-[15] h-2.5 w-2.5 -translate-x-1/2 rotate-45 border border-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${accent}`}
                                        style={{ left: cx }}
                                        aria-label={`${ms.title}, ${ms.targetDate}`}
                                        onMouseEnter={(e) => {
                                          const r =
                                            e.currentTarget.getBoundingClientRect();
                                          setHovered({
                                            milestone: ms,
                                            progress,
                                            tipX: r.left + r.width / 2,
                                            tipY: r.bottom + 6,
                                          });
                                        }}
                                        onMouseLeave={() => setHovered(null)}
                                        onFocus={(e) => {
                                          const r =
                                            e.currentTarget.getBoundingClientRect();
                                          setHovered({
                                            milestone: ms,
                                            progress,
                                            tipX: r.left + r.width / 2,
                                            tipY: r.bottom + 6,
                                          });
                                        }}
                                        onBlur={() => setHovered(null)}
                                      />
                                      <span
                                        className="pointer-events-none absolute top-[34px] z-[14] max-w-[6.5rem] -translate-x-1/2 truncate text-center text-[9px] font-medium text-zinc-500"
                                        style={{ left: cx }}
                                      >
                                        {ms.title}
                                      </span>
                                    </div>
                                  );
                                })}
                              </>
                            ) : (
                              <span className="absolute left-3 top-5 text-[10px] text-zinc-600">
                                Add milestone dates
                              </span>
                            )}

                          </div>
                        );
                      })
                    : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {hovered ? (
        <MilestoneTip
          milestone={hovered.milestone}
          progress={hovered.progress}
          tipX={hovered.tipX}
          tipY={hovered.tipY}
        />
      ) : null}
    </div>
  );
}

function MilestoneTip({
  milestone,
  progress,
  tipX,
  tipY,
}: {
  milestone: ProductMilestoneMeta;
  progress: number | null;
  tipX: number;
  tipY: number;
}) {
  const d = milestone.targetDate?.trim()
    ? parseISODate(milestone.targetDate.slice(0, 10))
    : null;
  const dateStr = d
    ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";

  return (
    <div
      className="pointer-events-none fixed z-[100] max-w-[220px] -translate-x-1/2 rounded-xl border border-zinc-700 bg-zinc-900/98 px-3 py-2.5 text-zinc-100 shadow-2xl backdrop-blur-sm"
      style={{ left: tipX, top: tipY }}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 h-2 w-2 shrink-0 rotate-45 bg-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight text-zinc-50">
            {milestone.title}
          </p>
          {progress != null ? (
            <p className="mt-1 text-xs text-violet-300">{progress}% tasks done</p>
          ) : (
            <p className="mt-1 text-xs text-zinc-500">No linked tasks</p>
          )}
          {dateStr ? (
            <p className="mt-1 text-xs text-zinc-400">{dateStr}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
