"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  FolderOpen,
  LayoutList,
  Loader2,
  MoreVertical,
  Play,
  Square,
  Tag,
  Timer,
  Trash2,
} from "lucide-react";
import {
  MONEY_JOURNAL_TAG,
  type MoneyJournalEntryPayload,
} from "@/lib/crm/money-journal-types";
import { createClient } from "@/lib/supabase/client";
import {
  deleteTimeEntry,
  startTimeEntry,
  stopTimeEntry,
} from "@/app/(crm)/actions/time-tracking";

type ProjectRow = {
  id: string;
  title: string;
  client: {
    name: string | null;
    company: string | null;
    email: string | null;
  } | null;
};

type TaskRow = {
  id: string;
  title: string;
  project_id: string;
};

type ProjectQueryRow = {
  id: string;
  title: string;
  client:
    | { name: string | null; company: string | null; email: string | null }
    | { name: string | null; company: string | null; email: string | null }[]
    | null;
};

function projectsFromQuery(rows: ProjectQueryRow[] | null): ProjectRow[] {
  if (!rows?.length) return [];
  return rows.map((p) => {
    const c = p.client;
    const one = Array.isArray(c) ? (c[0] ?? null) : c;
    return {
      id: p.id,
      title: p.title,
      client: one
        ? {
            name: one.name ?? null,
            company: one.company ?? null,
            email: one.email ?? null,
          }
        : null,
    };
  });
}

export type TimeEntryRow = {
  id: string;
  description: string;
  started_at: string;
  ended_at: string | null;
  billable: boolean;
  tags: string[];
  project_id: string | null;
  task_id: string | null;
  journal_data: MoneyJournalEntryPayload | null;
};

function weekMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function localDayKey(iso: string): string {
  const t = new Date(iso);
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const day = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sameLocalDay(iso: string, anchor: Date): boolean {
  const t = new Date(iso);
  return (
    t.getFullYear() === anchor.getFullYear() &&
    t.getMonth() === anchor.getMonth() &&
    t.getDate() === anchor.getDate()
  );
}

function formatDurationSeconds(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function durationSeconds(entry: TimeEntryRow, nowMs: number): number {
  const start = new Date(entry.started_at).getTime();
  const end = entry.ended_at
    ? new Date(entry.ended_at).getTime()
    : nowMs;
  return Math.max(0, Math.floor((end - start) / 1000));
}

function formatRangeLabel(startIso: string, endIso: string | null, nowMs: number) {
  const fmt = (ms: number) =>
    new Date(ms).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  const s = new Date(startIso).getTime();
  const e = endIso ? new Date(endIso).getTime() : nowMs;
  return `${fmt(s)} - ${fmt(e)}`;
}

function formatSelectedHeader(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function clientDisplay(p: ProjectRow | undefined): string {
  if (!p?.client) return "—";
  const c = p.client;
  return (
    c.name?.trim() ||
    c.company?.trim() ||
    c.email?.trim() ||
    "—"
  );
}

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function tagColor(label: string) {
  let h = 0;
  for (let i = 0; i < label.length; i += 1) {
    h = label.charCodeAt(i) + ((h << 5) - h);
  }
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 55% 42%)`;
}

export default function TimeTrackingView() {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [workDescription, setWorkDescription] = useState("");
  const [billable, setBillable] = useState(true);
  const [tagsInput, setTagsInput] = useState("");
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [entries, setEntries] = useState<TimeEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [journalDetail, setJournalDetail] = useState<TimeEntryRow | null>(null);

  const monday = useMemo(() => weekMonday(selectedDate), [selectedDate]);
  const weekDays = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < 7; i += 1) {
      arr.push(addDays(monday, i));
    }
    return arr;
  }, [monday]);

  const projectById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );
  const taskById = useMemo(
    () => new Map(tasks.map((t) => [t.id, t])),
    [tasks]
  );

  const tasksForProject = useMemo(() => {
    if (!projectId.trim()) return tasks;
    return tasks.filter((t) => t.project_id === projectId);
  }, [tasks, projectId]);

  const loadAll = useCallback(async () => {
    setLoadErr(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setLoadErr("Sign in to track time.");
      return;
    }

    const rangeStart = addDays(monday, -1);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = addDays(monday, 8);
    rangeEnd.setHours(0, 0, 0, 0);

    const [pRes, tRes, eRes, runRes] = await Promise.all([
      supabase
        .from("project")
        .select("id, title, client:client_id ( name, company, email )")
        .not("parent_project_id", "is", null)
        .order("title")
        .limit(300),
      supabase
        .from("task")
        .select("id, title, project_id")
        .order("title")
        .limit(500),
      supabase
        .from("time_entry")
        .select(
          "id, description, started_at, ended_at, billable, tags, project_id, task_id, journal_data"
        )
        .eq("user_id", user.id)
        .gte("started_at", rangeStart.toISOString())
        .lt("started_at", rangeEnd.toISOString())
        .order("started_at", { ascending: false }),
      supabase
        .from("time_entry")
        .select(
          "id, description, started_at, ended_at, billable, tags, project_id, task_id, journal_data"
        )
        .eq("user_id", user.id)
        .is("ended_at", null)
        .maybeSingle(),
    ]);

    if (pRes.error) {
      setLoadErr(pRes.error.message);
      setLoading(false);
      return;
    }
    if (tRes.error) {
      setLoadErr(tRes.error.message);
      setLoading(false);
      return;
    }
    if (eRes.error) {
      setLoadErr(eRes.error.message);
      setLoading(false);
      return;
    }
    if (runRes.error) {
      setLoadErr(runRes.error.message);
      setLoading(false);
      return;
    }

    const list = [...((eRes.data ?? []) as TimeEntryRow[])];
    const running = runRes.data as TimeEntryRow | null;
    if (running?.id && !list.some((x) => x.id === running.id)) {
      list.unshift(running);
    }
    list.sort(
      (a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );

    setProjects(projectsFromQuery(pRes.data as ProjectQueryRow[] | null));
    setTasks((tRes.data ?? []) as TaskRow[]);
    setEntries(
      list.map((row) => ({
        ...row,
        journal_data:
          (row as { journal_data?: unknown }).journal_data != null
            ? ((row as { journal_data: unknown })
                .journal_data as MoneyJournalEntryPayload)
            : null,
      }))
    );
    setLoading(false);
  }, [monday]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!menuOpenId) return;
    const close = () => setMenuOpenId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpenId]);

  const runningEntry = useMemo(
    () => entries.find((e) => e.ended_at === null) ?? null,
    [entries]
  );

  const runningElapsed = runningEntry
    ? durationSeconds(runningEntry, nowMs)
    : 0;

  const dayTotalsSec = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const d of weekDays) {
      totals[localDayKey(d.toISOString())] = 0;
    }
    for (const e of entries) {
      const key = localDayKey(e.started_at);
      if (!(key in totals)) continue;
      totals[key] += durationSeconds(e, nowMs);
    }
    return totals;
  }, [entries, weekDays, nowMs]);

  const weekTotalSec = useMemo(
    () => Object.values(dayTotalsSec).reduce((a, b) => a + b, 0),
    [dayTotalsSec]
  );

  const entriesForSelectedDay = useMemo(() => {
    return entries.filter((e) => sameLocalDay(e.started_at, selectedDate));
  }, [entries, selectedDate]);

  async function onStartStop() {
    setActionBusy(true);
    setLoadErr(null);
    if (runningEntry) {
      const res = await stopTimeEntry();
      setActionBusy(false);
      if ("error" in res && res.error) {
        setLoadErr(res.error);
        return;
      }
      await loadAll();
      return;
    }
    const tags = tagsInput
      .split(/[,]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    const res = await startTimeEntry({
      description: workDescription,
      projectId: projectId.trim() || null,
      taskId: taskId.trim() || null,
      billable,
      tags,
    });
    setActionBusy(false);
    if ("error" in res && res.error) {
      setLoadErr(res.error);
      return;
    }
    setWorkDescription("");
    setTagsInput("");
    await loadAll();
  }

  async function onDeleteEntry(id: string) {
    if (!confirm("Delete this time entry?")) return;
    const res = await deleteTimeEntry(id);
    if ("error" in res && res.error) {
      setLoadErr(res.error);
      return;
    }
    setMenuOpenId(null);
    await loadAll();
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-text-secondary dark:text-zinc-400">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        Loading…
      </div>
    );
  }

  const selectBaseClass =
    "w-full rounded-lg border border-border bg-white py-2 pl-2.5 pr-8 text-sm text-text-primary shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100 dark:focus:border-blue-500/60 dark:focus:ring-blue-500/15";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/15 dark:bg-blue-500/15 dark:text-blue-400 dark:ring-blue-500/25">
              <Timer className="h-4 w-4" aria-hidden />
            </span>
            <h1 className="heading-display text-2xl font-bold tracking-tight text-text-primary dark:text-zinc-100">
              Time Tracking
            </h1>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-secondary dark:text-zinc-400">
            Start working without losing time — log hours to tasks and delivery
            phases.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className="inline-flex rounded-xl border border-border bg-zinc-50/90 p-1 shadow-sm dark:border-zinc-700 dark:bg-zinc-950/80"
            role="group"
            aria-label="View mode"
          >
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                viewMode === "list"
                  ? "bg-white text-text-primary shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-text-secondary hover:text-text-primary dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
            >
              <LayoutList className="h-4 w-4" aria-hidden />
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                viewMode === "calendar"
                  ? "bg-white text-text-primary shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-text-secondary hover:text-text-primary dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
            >
              <CalendarDays className="h-4 w-4" aria-hidden />
              Calendar
            </button>
          </div>
          <div className="flex items-center gap-0.5 rounded-xl border border-border bg-white px-1 py-1 shadow-sm dark:border-zinc-700 dark:bg-zinc-950/80">
            <button
              type="button"
              onClick={() => setSelectedDate((d) => addDays(d, -1))}
              className="rounded-lg p-2 text-text-secondary transition hover:bg-surface hover:text-text-primary dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[11rem] text-center text-sm font-semibold tabular-nums text-text-primary dark:text-zinc-100">
              {formatSelectedHeader(selectedDate)}
            </span>
            <button
              type="button"
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
              className="rounded-lg p-2 text-text-secondary transition hover:bg-surface hover:text-text-primary dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {loadErr ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          {loadErr}
        </p>
      ) : null}

      {/* Entry / timer */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm ring-1 ring-black/[0.03] dark:border-zinc-800 dark:bg-zinc-950/90 dark:ring-white/[0.04]">
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-stretch lg:gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary/80 dark:text-zinc-500">
              Current session
            </label>
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800/90 dark:text-zinc-400">
                <Timer className="h-5 w-5" aria-hidden />
              </span>
              <input
                type="text"
                value={workDescription}
                onChange={(e) => setWorkDescription(e.target.value)}
                disabled={Boolean(runningEntry)}
                placeholder="What are you working on?"
                className="min-w-0 flex-1 border-0 bg-transparent text-base font-medium text-text-primary outline-none placeholder:font-normal placeholder:text-text-secondary/55 disabled:opacity-60 dark:text-zinc-100 sm:text-lg"
              />
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center lg:flex-col lg:items-end xl:flex-row">
            <div className="flex min-w-[9.5rem] items-center justify-between gap-3 rounded-lg border border-zinc-200/90 bg-zinc-50 px-3 py-2 dark:border-zinc-700/70 dark:bg-zinc-900/45 sm:justify-end">
              <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                {runningEntry ? "Elapsed" : "Ready"}
              </span>
              <span className="font-mono text-lg font-medium tabular-nums tracking-tight text-zinc-800 dark:text-zinc-100">
                {formatDurationSeconds(
                  runningEntry ? runningElapsed : 0
                )}
              </span>
            </div>
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => void onStartStop()}
              className={`flex h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg px-4 text-xs font-semibold shadow-sm transition sm:h-9 sm:w-auto sm:min-w-[6.25rem] ${
                runningEntry
                  ? "bg-rose-500 text-white hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-500"
                  : "bg-accent text-white hover:bg-accent/90 dark:bg-blue-500 dark:hover:bg-blue-400"
              } disabled:opacity-50`}
            >
              {actionBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : runningEntry ? (
                <>
                  <Square className="h-3.5 w-3.5 fill-current" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 translate-x-px fill-current" />
                  Start
                </>
              )}
            </button>
          </div>
        </div>

        <div className="border-t border-border bg-surface/40 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:px-5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary/80 dark:text-zinc-500">
            Link to work
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-text-secondary dark:text-zinc-400">
                Billing
              </span>
              <button
                type="button"
                onClick={() => (runningEntry ? null : setBillable((b) => !b))}
                disabled={Boolean(runningEntry)}
                className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:opacity-60 ${
                  billable
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
                    : "border-border bg-white text-text-secondary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                }`}
              >
                <DollarSign className="h-4 w-4 shrink-0" aria-hidden />
                {billable ? "Billable" : "Non-billable"}
              </button>
            </div>
            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-text-secondary dark:text-zinc-400">
                <Tag className="h-3.5 w-3.5 opacity-70" aria-hidden />
                Tags
              </span>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                disabled={Boolean(runningEntry)}
                placeholder="e.g. design, client-call"
                className={`${selectBaseClass} disabled:opacity-60`}
              />
            </div>
            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-text-secondary dark:text-zinc-400">
                <Briefcase className="h-3.5 w-3.5 opacity-70" aria-hidden />
                Project
              </span>
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setTaskId("");
                }}
                disabled={Boolean(runningEntry)}
                className={`${selectBaseClass} disabled:opacity-60`}
              >
                <option value="">Select phase…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-text-secondary dark:text-zinc-400">
                <FolderOpen className="h-3.5 w-3.5 opacity-70" aria-hidden />
                Task
              </span>
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                disabled={Boolean(runningEntry) || !projectId}
                className={`${selectBaseClass} disabled:opacity-60`}
              >
                <option value="">Select task…</option>
                {tasksForProject.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Week summary */}
      <div className="rounded-2xl border border-border bg-zinc-50/80 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-secondary/80 dark:text-zinc-500">
              This week
            </p>
            <div className="flex flex-wrap gap-2">
              {weekDays.map((d, i) => {
                const dayKey = localDayKey(d.toISOString());
                const sec = dayTotalsSec[dayKey] ?? 0;
                const active =
                  localDayKey(selectedDate.toISOString()) === dayKey;
                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => setSelectedDate(new Date(d))}
                    className={`min-w-[4.25rem] rounded-xl px-3 py-2.5 text-left transition ${
                      active
                        ? "bg-accent/12 text-accent shadow-sm ring-1 ring-accent/25 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/30"
                        : "bg-white text-text-secondary ring-1 ring-border hover:bg-surface hover:text-text-primary dark:bg-zinc-950/80 dark:text-zinc-400 dark:ring-zinc-700 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-200"
                    }`}
                  >
                    <div
                      className={`text-[11px] font-semibold uppercase tracking-wide ${active ? "text-accent/90 dark:text-blue-300/90" : ""}`}
                    >
                      {WEEK_DAYS[i]}
                    </div>
                    <div
                      className={`mt-0.5 text-sm font-semibold tabular-nums ${active ? "text-text-primary dark:text-zinc-50" : ""}`}
                    >
                      {formatDurationSeconds(sec)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="shrink-0 rounded-xl border border-border bg-white px-5 py-3 text-right shadow-sm dark:border-zinc-700 dark:bg-zinc-950/80">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary dark:text-zinc-500">
              Week total
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-text-primary dark:text-zinc-50">
              {formatDurationSeconds(weekTotalSec)}
            </div>
          </div>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <div className="rounded-2xl border border-dashed border-border bg-gradient-to-b from-zinc-50/80 to-white px-6 py-14 text-center dark:border-zinc-800 dark:from-zinc-950/60 dark:to-zinc-950/30">
          <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent dark:bg-blue-500/15 dark:text-blue-400">
              <CalendarDays className="h-6 w-6" aria-hidden />
            </span>
            <p className="text-sm font-medium text-text-primary dark:text-zinc-200">
              Calendar view is coming soon
            </p>
            <p className="text-sm text-text-secondary dark:text-zinc-500">
              Use the list below to review and manage entries for now.
            </p>
          </div>
        </div>
      ) : null}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm ring-1 ring-black/[0.03] dark:border-zinc-800 dark:bg-zinc-950/70 dark:ring-white/[0.04]">
        <div className="border-b border-border px-4 py-3 dark:border-zinc-800 sm:px-5">
          <h2 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
            {formatSelectedHeader(selectedDate)}
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary dark:text-zinc-500">
            {entriesForSelectedDay.length === 0
              ? "No entries yet"
              : `${entriesForSelectedDay.length} entr${entriesForSelectedDay.length === 1 ? "y" : "ies"}`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-zinc-50/90 text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary/90 dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-500">
                <th className="px-4 py-3.5 sm:px-5">Task</th>
                <th className="px-4 py-3.5 sm:px-5">Project</th>
                <th className="px-4 py-3.5 sm:px-5">Client</th>
                <th className="px-4 py-3.5 text-right sm:px-5">Duration</th>
                <th className="w-12 px-2 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-zinc-800">
              {entriesForSelectedDay.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-0">
                    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800/90">
                        <Timer
                          className="h-7 w-7 text-zinc-400 dark:text-zinc-500"
                          aria-hidden
                        />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-text-primary dark:text-zinc-200">
                          Nothing logged for this day
                        </p>
                        <p className="mt-1 max-w-sm text-sm text-text-secondary dark:text-zinc-500">
                          Start the timer above or choose another day in the
                          week strip.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                entriesForSelectedDay.map((e) => {
                  const p = e.project_id
                    ? projectById.get(e.project_id)
                    : undefined;
                  const t = e.task_id ? taskById.get(e.task_id) : undefined;
                  const dur = durationSeconds(e, nowMs);
                  const isJournal = Boolean(e.journal_data);
                  const tagPills = (e.tags ?? []).filter(
                    (t) => t.toLowerCase() !== MONEY_JOURNAL_TAG
                  );
                  return (
                    <tr
                      key={e.id}
                      onClick={() => {
                        if (isJournal) setJournalDetail(e);
                      }}
                      className={`hover:bg-surface/40 dark:hover:bg-zinc-900/40 ${
                        isJournal
                          ? "cursor-pointer"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          {e.billable ? (
                            <DollarSign
                              className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                              aria-label="Billable"
                            />
                          ) : null}
                          {isJournal ? (
                            <span
                              className="inline-flex items-center gap-0.5 rounded-md bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700 ring-1 ring-indigo-500/25 dark:bg-indigo-500/20 dark:text-indigo-200"
                              title="Money Journal"
                            >
                              <BookOpen className="h-3 w-3" />
                              Journal
                            </span>
                          ) : null}
                          <span className="font-medium text-text-primary dark:text-zinc-100">
                            {e.description || "—"}
                          </span>
                          {tagPills.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                              style={{ backgroundColor: tagColor(tag) }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-primary dark:text-zinc-200">
                        <span className="inline-flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5 opacity-50" />
                          {p?.title ?? "—"}
                        </span>
                        {t ? (
                          <div className="mt-0.5 text-xs text-text-secondary dark:text-zinc-500">
                            {t.title}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-text-primary dark:text-zinc-200">
                        {clientDisplay(p)}
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        <div className="font-semibold tabular-nums text-text-primary dark:text-zinc-100">
                          {formatDurationSeconds(dur)}
                        </div>
                        <div className="text-xs text-text-secondary dark:text-zinc-500">
                          {formatRangeLabel(
                            e.started_at,
                            e.ended_at,
                            nowMs
                          )}
                        </div>
                      </td>
                      <td className="relative px-2 py-3 text-right align-top">
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setMenuOpenId((id) =>
                              id === e.id ? null : e.id
                            );
                          }}
                          className="rounded-lg p-1.5 text-text-secondary hover:bg-surface dark:hover:bg-zinc-800"
                          aria-label="Actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {menuOpenId === e.id ? (
                          <div className="absolute right-2 top-10 z-10 min-w-[8rem] rounded-xl border border-border bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                            <button
                              type="button"
                              onClick={() => void onDeleteEntry(e.id)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {journalDetail?.journal_data ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Money Journal entry"
          onClick={() => setJournalDetail(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-text-primary dark:text-zinc-100">
                Money Journal · hour {journalDetail.journal_data.hourNumber}
              </h3>
              <button
                type="button"
                onClick={() => setJournalDetail(null)}
                className="rounded-lg px-2 py-1 text-sm text-text-secondary hover:bg-surface dark:hover:bg-zinc-800"
              >
                Close
              </button>
            </div>
            {(() => {
              const j = journalDetail.journal_data;
              if (!j) return null;
              return (
                <div className="mt-4 space-y-3 text-sm text-text-primary dark:text-zinc-200">
                  <p className="text-text-secondary dark:text-zinc-400">
                    {j.startTimeLabel} – {j.stopTimeLabel}
                    {j.timerStartedAtIso || j.timerStoppedAtIso ? (
                      <span className="mt-1 block text-xs text-text-secondary/85 dark:text-zinc-500">
                        {j.timerStartedAtIso
                          ? new Date(j.timerStartedAtIso).toLocaleString()
                          : "—"}{" "}
                        →{" "}
                        {j.timerStoppedAtIso
                          ? new Date(j.timerStoppedAtIso).toLocaleString()
                          : "—"}
                      </span>
                    ) : null}
                  </p>
                  <p>
                    <span className="font-medium">Prospecting: </span>
                    {j.prospectingDone || "—"}
                  </p>
                  <p>
                    <span className="font-medium">I will use the money for: </span>
                    {j.moneyPurpose || "—"}
                  </p>
                  <div>
                    <p className="font-medium">This 60 minutes</p>
                    <p className="mt-1 whitespace-pre-wrap text-text-secondary dark:text-zinc-400">
                      {j.workDetail60m || "—"}
                    </p>
                  </div>
                  <p>
                    <span className="font-medium">Focus & effort: </span>
                    {j.focusEffortRating || "—"}
                  </p>
                  <p>
                    <span className="font-medium">Next hour: </span>
                    {j.improveNextHour || "—"}
                  </p>
                  <p>
                    <span className="font-medium">Promise: </span>
                    {j.promiseKeepGoing || "—"}
                  </p>
                </div>
              );
            })()}
          </div>
        </div>
      ) : null}
    </div>
  );
}
