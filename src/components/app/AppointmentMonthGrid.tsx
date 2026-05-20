"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
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
  onMoveEvent,
}: {
  rows: AppointmentCalendarRow[];
  visibleMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onSelectDay: (day: Date) => void;
  onEditEvent: (row: AppointmentCalendarRow) => void;
  /**
   * Drop a draggable event card onto a different day cell. The grid keeps the
   * appointment's wall-clock time and duration; only the calendar date moves.
   * Omit the prop to disable drag-and-drop entirely (the calendar still works
   * for read + edit).
   */
  onMoveEvent?: (
    row: AppointmentCalendarRow,
    newStartsAt: string,
    newEndsAt: string
  ) => Promise<void> | void;
}) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const cells = useMemo(() => buildMonthCells(visibleMonth), [visibleMonth]);
  const today = startOfDay(new Date());

  // 6px activation distance matches the rest of the codebase (ColdOutreachView).
  // Without this the click-to-edit interaction below would race with drag start.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const dragEnabled = typeof onMoveEvent === "function";

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

  const rowsById = useMemo(() => {
    const map = new Map<string, AppointmentCalendarRow>();
    for (const r of rows) map.set(r.id, r);
    return map;
  }, [rows]);
  const activeDragRow = activeDragId ? rowsById.get(activeDragId) ?? null : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  function handleDragCancel() {
    setActiveDragId(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    if (!dragEnabled || !onMoveEvent) return;
    const overId = event.over?.id;
    const activeId = String(event.active.id);
    if (!overId) return;
    const row = rowsById.get(activeId);
    if (!row) return;

    const target = parseDayKey(String(overId));
    if (!target) return;

    const start = new Date(row.starts_at);
    const end = new Date(row.ends_at);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

    // No-op if dropped on the same day to avoid an unnecessary write.
    if (
      start.getFullYear() === target.getFullYear() &&
      start.getMonth() === target.getMonth() &&
      start.getDate() === target.getDate()
    ) {
      return;
    }

    const duration = end.getTime() - start.getTime();
    const newStart = new Date(target);
    newStart.setHours(
      start.getHours(),
      start.getMinutes(),
      start.getSeconds(),
      start.getMilliseconds()
    );
    const newEnd = new Date(newStart.getTime() + Math.max(duration, 0));

    void onMoveEvent(row, newStart.toISOString(), newEnd.toISOString());
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
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
              <DayDropCell
                key={k}
                dayKey={k}
                date={date}
                inMonth={inMonth}
                isToday={isToday}
                onSelectDay={onSelectDay}
                isDragging={activeDragId !== null}
              >
                <div className="relative z-[1] flex flex-col gap-1 pr-0.5 pt-8">
                  {visible.map((ev) => (
                    <DraggableEventCard
                      key={ev.id}
                      ev={ev}
                      isDragGhost={activeDragId === ev.id}
                      dragEnabled={dragEnabled}
                      onEdit={onEditEvent}
                    />
                  ))}
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
              </DayDropCell>
            );
          })}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDragRow ? <EventCardPresentational ev={activeDragRow} floating /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function parseDayKey(key: string): Date | null {
  const [yStr, mStr, dStr] = key.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (
    !Number.isFinite(y) ||
    !Number.isFinite(m) ||
    !Number.isFinite(d)
  ) {
    return null;
  }
  return new Date(y, m, d);
}

function DayDropCell({
  dayKey,
  date,
  inMonth,
  isToday,
  onSelectDay,
  isDragging,
  children,
}: {
  dayKey: string;
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  onSelectDay: (day: Date) => void;
  isDragging: boolean;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: dayKey });
  const highlight = isOver
    ? "ring-2 ring-blue-500/70 ring-offset-1 ring-offset-white dark:ring-offset-zinc-950"
    : "";

  return (
    <div
      ref={setNodeRef}
      className={`relative min-h-[5.5rem] bg-white p-1 transition-shadow sm:min-h-[6.75rem] dark:bg-zinc-950 ${
        !inMonth ? "opacity-[0.42]" : ""
      } ${highlight}`}
      data-day-key={dayKey}
    >
      <button
        type="button"
        className="absolute right-1 top-1 z-0 flex h-7 min-w-[1.75rem] items-center justify-center rounded-full p-0 text-xs font-semibold text-zinc-800 dark:text-zinc-100"
        onClick={() => onSelectDay(date)}
        // Cell is the drop target during a drag; ignore the add-on-day click so
        // a drop doesn't accidentally trigger the "new appointment" modal.
        disabled={isDragging}
        aria-label={`Add appointment on ${date.toLocaleDateString()}`}
      >
        {isToday ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[12px] text-white dark:bg-blue-500">
            {date.getDate()}
          </span>
        ) : (
          <span
            className={`px-1 ${
              inMonth ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"
            }`}
          >
            {date.getDate()}
          </span>
        )}
      </button>
      {children}
    </div>
  );
}

function DraggableEventCard({
  ev,
  isDragGhost,
  dragEnabled,
  onEdit,
}: {
  ev: AppointmentCalendarRow;
  isDragGhost: boolean;
  dragEnabled: boolean;
  onEdit: (row: AppointmentCalendarRow) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ev.id,
    disabled: !dragEnabled,
  });

  // While this card is the source of an active drag, hide the original so only
  // the DragOverlay clone follows the cursor — avoids a "double" rendered card.
  const ghostClass = isDragGhost || isDragging ? "opacity-0 pointer-events-none" : "";

  return (
    <div ref={setNodeRef} className={ghostClass}>
      <div
        className={`group/event flex items-stretch rounded-md border border-zinc-200/80 shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-colors hover:brightness-[0.98] dark:border-zinc-700/80 ${appointmentEventBarClasses(
          ev.status
        )}`}
      >
        {dragEnabled ? (
          <button
            type="button"
            className="flex shrink-0 cursor-grab touch-none items-center rounded-l-md px-1 text-zinc-500/70 opacity-0 transition-opacity hover:text-zinc-800 active:cursor-grabbing group-hover/event:opacity-100 dark:text-zinc-400/80 dark:hover:text-zinc-100"
            aria-label={`Drag ${ev.title}`}
            {...listeners}
            {...attributes}
          >
            <GripVertical className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(ev);
          }}
          className="min-w-0 flex-1 px-1.5 py-1 text-left"
        >
          <EventCardBody ev={ev} />
        </button>
      </div>
    </div>
  );
}

function EventCardPresentational({
  ev,
  floating,
}: {
  ev: AppointmentCalendarRow;
  floating?: boolean;
}) {
  return (
    <div
      className={`w-44 rounded-md border border-zinc-200/80 px-1.5 py-1 ${
        appointmentEventBarClasses(ev.status)
      } ${
        floating
          ? "shadow-2xl ring-2 ring-blue-500/40 dark:border-zinc-700/80"
          : "shadow-[0_1px_0_rgba(0,0,0,0.02)] dark:border-zinc-700/80"
      }`}
    >
      <EventCardBody ev={ev} />
    </div>
  );
}

function EventCardBody({ ev }: { ev: AppointmentCalendarRow }) {
  const metaLine = compactMeta([ev.clientName, ev.company, ev.projectType]);
  return (
    <>
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
    </>
  );
}
