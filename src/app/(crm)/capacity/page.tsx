"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Users, TrendingUp, AlertTriangle, FolderKanban } from "lucide-react";
import { teamMembers, projects } from "@/lib/crm/mock-data";
import KpiCard from "@/components/crm/KpiCard";

function getWeekRange(offset: number) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - start.getDay() + offset * 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

function formatRange(start: Date, end: Date) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} - ${end.toLocaleDateString("en-US", opts)}`;
}

export default function CapacityPage() {
  const [weekOffset, setWeekOffset] = useState(0);

  const { start, end } = useMemo(() => getWeekRange(weekOffset), [weekOffset]);

  const avgUtilization =
    teamMembers.length === 0
      ? 0
      : Math.round(
          teamMembers.reduce((s, m) => s + m.utilization, 0) / teamMembers.length
        );
  const overallocated = teamMembers.filter((m) => m.utilization > 100).length;
  const activeProjectCount = projects.filter(
    (p) =>
      p.plan === "building" ||
      p.plan === "testing" ||
      p.plan === "release"
  ).length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-display text-2xl font-bold text-text-primary">
            Sprint &amp; Team Bandwidth Tracker
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Monitor team capacity, project allocations, and sprint utilization
            across all projects
          </p>
        </div>
        <Link
          href="/team"
          className="text-sm font-medium text-accent hover:underline"
        >
          View Team →
        </Link>
      </div>

      {/* KPI row */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Team Members"
          value={String(teamMembers.length)}
          icon={<Users className="h-5 w-5" />}
        />
        <KpiCard
          label="Average Utilization"
          value={`${avgUtilization}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          accent={avgUtilization > 100}
        />
        <KpiCard
          label="Overallocated Members"
          value={String(overallocated)}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent={overallocated > 0}
        />
        <KpiCard
          label="Active Projects"
          value={String(activeProjectCount)}
          icon={<FolderKanban className="h-5 w-5" />}
        />
      </div>

      {/* Capacity Overview */}
      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary">
            <span className="text-text-secondary/60">📅</span>
            Team Capacity Overview
          </h2>
          <div className="flex items-center gap-3">
            <select className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-text-primary">
              <option>Week</option>
            </select>
            <div className="flex items-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => setWeekOffset(weekOffset - 1)}
                className="rounded-lg border border-border px-2 py-1 text-text-secondary hover:bg-surface"
              >
                ‹
              </button>
              <span className="min-w-[180px] text-center font-medium text-text-primary">
                {formatRange(start, end)}
              </span>
              <button
                type="button"
                onClick={() => setWeekOffset(weekOffset + 1)}
                className="rounded-lg border border-border px-2 py-1 text-text-secondary hover:bg-surface"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-xs text-text-secondary">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            ≤80% (Under Capacity)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            81-100% (Ideal)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            &gt;100% (Over-allocated)
          </span>
        </div>

        {/* Member bars */}
        <div className="mt-6 space-y-3">
          {teamMembers.map((member) => {
            const barColor =
              member.utilization > 100
                ? "bg-red-500"
                : member.utilization >= 81
                  ? "bg-green-500"
                  : "bg-amber-400";
            return (
              <div
                key={member.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-white px-4 py-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                  {member.avatarFallback}
                </div>
                <div className="w-32 shrink-0">
                  <p className="text-sm font-medium text-text-primary">
                    {member.name}
                  </p>
                  <p className="text-xs text-text-secondary">{member.role}</p>
                </div>
                <div className="flex flex-1 items-center gap-3">
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{
                        width: `${Math.min(member.utilization, 100)}%`,
                      }}
                    />
                  </div>
                  <span
                    className={`w-12 text-right text-sm font-medium ${
                      member.utilization > 100
                        ? "text-red-600"
                        : "text-text-primary"
                    }`}
                  >
                    {member.utilization}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
