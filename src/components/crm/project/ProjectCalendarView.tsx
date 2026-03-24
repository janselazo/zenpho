"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  getMemberById,
  TASK_STATUS_COLORS,
  TASK_STATUS_LABELS,
} from "@/lib/crm/mock-data";
import type { WorkspaceTask } from "@/lib/crm/project-workspace-types";
import {
  addDays,
  formatISODate,
  parseISODate,
  startOfWeekMonday,
} from "@/lib/crm/project-date-utils";
import { readStoredTeamMembers } from "@/lib/crm/team-members-storage";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const MAX_CHIPS = 3;

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function taskSpansDay(task: WorkspaceTask, day: Date): boolean {
  const s = parseISODate(task.startDate);
  const e = parseISODate(task.endDate);
  const x = new Date(day);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  x.setHours(0, 0, 0, 0);
  return x >= s && x <= e;
}

function buildMonthCells(monthCursor: Date): Date[] {
  const y = monthCursor.getFullYear();
  const m = monthCursor.getMonth();
  const first = new Date(y, m, 1);
  const lastDay = new Date(y, m + 1, 0);
  const start = startOfWeekMonday(first);
  const weekStartOfLast = startOfWeekMonday(lastDay);
  const end = addDays(weekStartOfLast, 6);
  const cells: Date[] = [];
  let d = new Date(start);
  d.setHours(0, 0, 0, 0);
  const end0 = new Date(end);
  end0.setHours(0, 0, 0, 0);
  while (d <= end0) {
    cells.push(new Date(d));
    d = addDays(d, 1);
  }
  return cells;
}

type Props = { tasks: WorkspaceTask[] };

export default function ProjectCalendarView({ tasks }: Props) {
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));

  const cells = useMemo(() => buildMonthCells(monthCursor), [monthCursor]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const members = readStoredTeamMembers();
  function resolveMember(assigneeId: string | null) {
    if (!assigneeId) return null;
    return (
      members.find((m) => m.id === assigneeId) ?? getMemberById(assigneeId)
    );
  }

  const monthTitle = monthCursor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  function goPrev() {
    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  function goNext() {
    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  function goToday() {
    setMonthCursor(startOfMonth(new Date()));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-text-primary dark:text-zinc-100">
            Calendar
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Tasks appear on every day from start through end date.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-zinc-700 shadow-sm hover:bg-surface dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <span className="min-w-[10rem] text-center text-sm font-semibold text-text-primary dark:text-zinc-100">
            {monthTitle}
          </span>
          <button
            type="button"
            onClick={goNext}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-zinc-700 shadow-sm hover:bg-surface dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-text-primary shadow-sm hover:bg-surface dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Today
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-7 border-b border-border dark:border-zinc-700">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="px-1 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-text-secondary"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day) => {
              const inMonth = day.getMonth() === monthCursor.getMonth();
              const isToday = day.getTime() === today.getTime();
              const dayTasks = tasks
                .filter((t) => taskSpansDay(t, day))
                .sort((a, b) => a.title.localeCompare(b.title));
              const iso = formatISODate(day);

              return (
                <div
                  key={iso}
                  className={`min-h-[6.5rem] border-b border-r border-border p-1 [&:nth-child(7n)]:border-r-0 dark:border-zinc-700 ${
                    inMonth ? "bg-white dark:bg-zinc-900" : "bg-zinc-50/80 dark:bg-zinc-950/50"
                  } ${isToday ? "ring-1 ring-inset ring-accent/40" : ""}`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span
                      className={`text-xs font-semibold ${
                        inMonth
                          ? "text-text-primary dark:text-zinc-100"
                          : "text-text-secondary/60 dark:text-zinc-500"
                      } ${isToday ? "text-accent" : ""}`}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {dayTasks.slice(0, MAX_CHIPS).map((t) => {
                      const color = TASK_STATUS_COLORS[t.status] ?? "#64748b";
                      const member = resolveMember(t.assigneeId);
                      const who = member?.name?.trim() || null;
                      return (
                        <li key={t.id}>
                          <span
                            title={`${t.title}\n${t.startDate} → ${t.endDate}\n${TASK_STATUS_LABELS[t.status]}${who ? `\n${who}` : ""}`}
                            className="flex max-w-full items-center gap-0.5 rounded px-0.5 py-px"
                          >
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: color }}
                              aria-hidden
                            />
                            <span className="truncate text-[10px] font-medium leading-tight text-text-primary dark:text-zinc-200">
                              {t.title}
                            </span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  {dayTasks.length > MAX_CHIPS ? (
                    <p className="mt-0.5 text-[10px] font-medium text-text-secondary">
                      +{dayTasks.length - MAX_CHIPS} more
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Status colors
        </p>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
          {(
            Object.entries(TASK_STATUS_LABELS) as [
              keyof typeof TASK_STATUS_COLORS,
              string,
            ][]
          ).map(([key, label]) => (
            <li key={key} className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: TASK_STATUS_COLORS[key] }}
                aria-hidden
              />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
