"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AppointmentStatusBadge from "@/components/app/AppointmentStatusBadge";
import {
  appointmentEventBarClasses,
  type AppointmentStatus,
} from "@/lib/crm/appointment-status";

const WEEK_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

export type AppointmentCalendarRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  clientName?: string | null;
  company?: string | null;
  projectType?: string | null;
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function monthTitle(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatEventTime(iso: string): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  return t.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function compactMeta(parts: Array<string | null | undefined>): string {
  return parts
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p))
    .join(" · ");
}

type CalendarCell = {
  date: Date;
  inMonth: boolean;
};

function buildMonthCells(visibleMonth: Date): CalendarCell[] {
  const y = visibleMonth.getFullYear();
  const m = visibleMonth.getMonth();
  const first = new Date(y, m, 1);
  const lead = first.getDay();
  const start = new Date(first);
  start.setDate(first.getDate() - lead);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    cells.push({
      date,
      inMonth: date.getMonth() === m,
    });
  }
  return cells;
}

export default function AppointmentMonthGrid({
  rows,
  visibleMonth,
  onPrevMonth,
  onNextMonth,
  onToday,
  onSelectDay,
  onEditEvent,
}: {
  rows: AppointmentCalendarRow[];
  visibleMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onSelectDay: (day: Date) => void;
  onEditEvent: (row: AppointmentCalendarRow) => void;
}) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  const cells = useMemo(() => buildMonthCells(visibleMonth), [visibleMonth]);
  const today = startOfDay(new Date());

  const eventsByDayKey = useMemo(() => {
    const map = new Map<string, AppointmentCalendarRow[]>();
    for (const r of rows) {
      const t = new Date(r.starts_at);
      if (Number.isNaN(t.getTime())) continue;
      const k = `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    for (const [, list] of map) {
      list.sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
    }
    return map;
  }, [rows]);

  function dayKey(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  const MAX_COLLAPSED = 3;

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3.5 dark:border-zinc-800">
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 sm:justify-start">
          <button
            type="button"
            onClick={onPrevMonth}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <h2 className="min-w-0 truncate text-center text-base font-bold text-zinc-900 dark:text-zinc-50 sm:text-left sm:text-lg">
            {monthTitle(visibleMonth)}
          </h2>
          <button
            type="button"
            onClick={onNextMonth}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <button
          type="button"
          onClick={onToday}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Today
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-zinc-200/90 dark:bg-zinc-700/80">
        {WEEK_LABELS.map((lbl) => (
          <div
            key={lbl}
            className="bg-white py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:bg-zinc-950 dark:text-zinc-500"
          >
            {lbl}
          </div>
        ))}
        {cells.map(({ date, inMonth }) => {
          const k = dayKey(date);
          const dayEvents = eventsByDayKey.get(k) ?? [];
          const isToday = isSameDay(date, today);
          const expanded = expandedKeys.has(k);
          const cap = expanded ? dayEvents.length : MAX_COLLAPSED;
          const visible = dayEvents.slice(0, cap);
          const hidden = Math.max(0, dayEvents.length - MAX_COLLAPSED);

          return (
            <div
              key={k}
              className={`relative min-h-[5.5rem] bg-white p-1 sm:min-h-[6.75rem] dark:bg-zinc-950 ${
                !inMonth ? "opacity-[0.42]" : ""
              }`}
            >
              <button
                type="button"
                className="absolute right-1 top-1 z-0 flex h-7 min-w-[1.75rem] items-center justify-center rounded-full p-0 text-xs font-semibold text-zinc-800 dark:text-zinc-100"
                onClick={() => onSelectDay(date)}
                aria-label={`Add appointment on ${date.toLocaleDateString()}`}
              >
                {isToday ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[12px] text-white dark:bg-blue-500">
                    {date.getDate()}
                  </span>
                ) : (
                  <span
                    className={`px-1 ${inMonth ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"}`}
                  >
                    {date.getDate()}
                  </span>
                )}
              </button>

              <div className="relative z-[1] flex flex-col gap-1 pr-0.5 pt-8">
                {visible.map((ev) => {
                  const metaLine = compactMeta([
                    ev.clientName,
                    ev.company,
                    ev.projectType,
                  ]);
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditEvent(ev);
                      }}
                      className={`w-full rounded-md border border-zinc-200/80 px-1.5 py-1 text-left shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-colors hover:brightness-[0.98] dark:border-zinc-700/80 ${appointmentEventBarClasses(ev.status)}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-zinc-900 dark:text-zinc-50">
                          {ev.title}
                        </span>
                        <span className="shrink-0 tabular-nums text-[10px] font-medium text-zinc-600 dark:text-zinc-300">
                          {formatEventTime(ev.starts_at)}
                        </span>
                      </div>
                      {metaLine ? (
                        <p className="mt-0.5 truncate text-[10px] font-medium text-zinc-600/90 dark:text-zinc-300/90">
                          {metaLine}
                        </p>
                      ) : null}
                      <div className="mt-1">
                        <AppointmentStatusBadge status={ev.status} />
                      </div>
                    </button>
                  );
                })}
                {!expanded && hidden > 0 ? (
                  <button
                    type="button"
                    className="w-full py-0.5 text-left text-[10px] font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedKeys((prev) => new Set(prev).add(k));
                    }}
                  >
                    +{hidden} more…
                  </button>
                ) : null}
                {expanded && dayEvents.length > MAX_COLLAPSED ? (
                  <button
                    type="button"
                    className="w-full py-0.5 text-left text-[10px] font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedKeys((prev) => {
                        const next = new Set(prev);
                        next.delete(k);
                        return next;
                      });
                    }}
                  >
                    Show less
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
