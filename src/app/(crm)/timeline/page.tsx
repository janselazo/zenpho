"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { projects, sprints, getProjectById } from "@/lib/crm/mock-data";

const DAY_WIDTH = 36;

function parseDate(s: string) {
  return new Date(s + "T00:00:00");
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDateShort(d: Date) {
  return d.toLocaleDateString("en-US", { day: "numeric", weekday: "short" });
}

export default function TimelinePage() {
  const [sortBy, setSortBy] = useState<"date" | "name">("date");

  const { dateRange, projectRows } = useMemo(() => {
    const allDates = sprints.flatMap((s) => [
      parseDate(s.startDate),
      parseDate(s.endDate),
    ]);
    if (allDates.length === 0) {
      const now = new Date();
      return { dateRange: { start: now, end: now, days: 0 }, projectRows: [] };
    }
    const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
    minDate.setDate(minDate.getDate() - 3);
    maxDate.setDate(maxDate.getDate() + 7);
    const days = daysBetween(minDate, maxDate);

    const projectIds = [...new Set(sprints.map((s) => s.projectId))];
    const rows = projectIds
      .map((pid) => {
        const project = getProjectById(pid)!;
        const projectSprints = sprints
          .filter((s) => s.projectId === pid)
          .map((s) => ({
            ...s,
            offsetDays: daysBetween(minDate, parseDate(s.startDate)),
            durationDays: daysBetween(parseDate(s.startDate), parseDate(s.endDate)),
          }));
        const earliestStart = Math.min(
          ...projectSprints.map((s) => parseDate(s.startDate).getTime())
        );
        return { project, sprints: projectSprints, earliestStart };
      })
      .sort((a, b) =>
        sortBy === "date"
          ? a.earliestStart - b.earliestStart
          : a.project.title.localeCompare(b.project.title)
      );

    return {
      dateRange: { start: minDate, end: maxDate, days },
      projectRows: rows,
    };
  }, [sortBy]);

  const dayColumns = Array.from({ length: dateRange.days }, (_, i) => {
    const d = new Date(dateRange.start);
    d.setDate(d.getDate() + i);
    return d;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOffset = daysBetween(dateRange.start, today);

  return (
    <div className="flex flex-col p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-display text-2xl font-bold text-text-primary">
            Timeline
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {sprints.length} sprints · Click to edit
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSortBy(sortBy === "date" ? "name" : "date")}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-surface"
          >
            Sort by {sortBy === "date" ? "Date" : "Name"}
          </button>
          <button
            type="button"
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-surface"
          >
            + Add Sprint
          </button>
          <Link
            href="/capacity"
            className="text-sm font-medium text-accent hover:underline"
          >
            View Team Capacity
          </Link>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
        {/* Date header */}
        <div className="flex border-b border-border">
          <div className="w-40 shrink-0 border-r border-border" />
          <div className="relative flex">
            {dayColumns.map((d, i) => {
              const isToday = d.getTime() === today.getTime();
              const isSunday = d.getDay() === 0;
              return (
                <div
                  key={i}
                  className={`flex shrink-0 flex-col items-center border-r py-2 text-[10px] ${
                    isToday
                      ? "bg-accent/5 font-bold text-accent"
                      : isSunday
                        ? "border-border/60 text-text-secondary/40"
                        : "border-border/30 text-text-secondary"
                  }`}
                  style={{ width: DAY_WIDTH }}
                >
                  <span>{formatDateShort(d)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rows */}
        {projectRows.map(({ project, sprints: pSprints }) => (
          <div key={project.id} className="flex border-b border-border last:border-b-0">
            <div className="flex w-40 shrink-0 items-center gap-2 border-r border-border px-3 py-3">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              <Link
                href={`/products/${project.id}`}
                className="truncate text-sm font-medium text-text-primary hover:text-accent"
              >
                {project.title}
              </Link>
            </div>
            <div className="relative flex-1" style={{ minWidth: dateRange.days * DAY_WIDTH }}>
              {/* Today line */}
              {todayOffset >= 0 && todayOffset <= dateRange.days && (
                <div
                  className="absolute top-0 h-full w-px bg-accent/40"
                  style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
                />
              )}
              {pSprints.map((s) => (
                <div
                  key={s.id}
                  className="absolute top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-[10px] font-medium text-white"
                  style={{
                    left: s.offsetDays * DAY_WIDTH + 2,
                    width: Math.max(s.durationDays * DAY_WIDTH - 4, 20),
                    backgroundColor: project.color,
                    opacity: s.isCurrent ? 1 : 0.6,
                  }}
                  title={`${s.name}: ${s.startDate} → ${s.endDate}`}
                >
                  <span className="truncate">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {projectRows.length === 0 && (
          <div className="py-16 text-center text-sm text-text-secondary">
            No sprints to display. Add sprints to your projects first.
          </div>
        )}
      </div>
    </div>
  );
}
