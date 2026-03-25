"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  FolderOpen,
  LayoutList,
  List,
  Loader2,
  MoreVertical,
  Play,
  Square,
  Tag,
  Timer,
  Trash2,
} from "lucide-react";
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

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thur", "Fri", "Sat", "Sun"] as const;

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
          "id, description, started_at, ended_at, billable, tags, project_id, task_id"
        )
        .eq("user_id", user.id)
        .gte("started_at", rangeStart.toISOString())
        .lt("started_at", rangeEnd.toISOString())
        .order("started_at", { ascending: false }),
      supabase
        .from("time_entry")
        .select(
          "id, description, started_at, ended_at, billable, tags, project_id, task_id"
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
    setEntries(list);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="heading-display text-2xl font-bold text-text-primary dark:text-zinc-100">
            Time Tracking
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
            Start working without losing time — log hours to tasks and projects.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-border bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${
                viewMode === "list"
                  ? "bg-surface text-text-primary dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-text-secondary dark:text-zinc-500"
              }`}
            >
              <LayoutList className="h-4 w-4" aria-hidden />
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ${
                viewMode === "calendar"
                  ? "bg-surface text-text-primary dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-text-secondary dark:text-zinc-500"
              }`}
            >
              <CalendarDays className="h-4 w-4" aria-hidden />
              Calendar
            </button>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-border bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setSelectedDate((d) => addDays(d, -1))}
              className="rounded-lg p-2 text-text-secondary hover:bg-surface dark:hover:bg-zinc-800"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[10rem] text-center text-sm font-semibold text-text-primary dark:text-zinc-100">
              {formatSelectedHeader(selectedDate)}
            </span>
            <button
              type="button"
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
              className="rounded-lg p-2 text-text-secondary hover:bg-surface dark:hover:bg-zinc-800"
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

      {/* Entry / timer bar */}
      <div className="rounded-2xl border border-border bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Timer className="h-5 w-5 shrink-0 text-text-secondary dark:text-zinc-500" />
            <List className="hidden h-5 w-5 shrink-0 text-text-secondary opacity-40 sm:block" />
            <input
              type="text"
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              disabled={Boolean(runningEntry)}
              placeholder="What are you working on?"
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary/60 disabled:opacity-60 dark:text-zinc-100"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 lg:border-t-0 lg:pt-0 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => runningEntry ? null : setBillable((b) => !b)}
              className={`rounded-lg p-2 ${billable ? "text-emerald-600 dark:text-emerald-400" : "text-text-secondary dark:text-zinc-500"}`}
              title="Billable"
              disabled={Boolean(runningEntry)}
            >
              <DollarSign className="h-5 w-5" />
            </button>
            <span className="rounded-lg p-2 text-text-secondary dark:text-zinc-500" title="Tags (comma-separated below)">
              <Tag className="h-5 w-5" />
            </span>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              disabled={Boolean(runningEntry)}
              placeholder="Tags"
              className="w-24 rounded-lg border border-border bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <span title="Project">
              <Briefcase className="inline h-5 w-5 text-text-secondary dark:text-zinc-500" />
            </span>
            <select
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setTaskId("");
              }}
              disabled={Boolean(runningEntry)}
              className="max-w-[10rem] rounded-lg border border-border bg-white py-1.5 pl-2 pr-6 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="">Project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <span title="Task">
              <FolderOpen className="inline h-5 w-5 text-text-secondary dark:text-zinc-500" />
            </span>
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              disabled={Boolean(runningEntry) || !projectId}
              className="max-w-[10rem] rounded-lg border border-border bg-white py-1.5 pl-2 pr-6 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="">Task</option>
              {tasksForProject.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            <span className="ml-auto font-mono text-sm font-semibold tabular-nums text-text-primary dark:text-zinc-100">
              {formatDurationSeconds(
                runningEntry ? runningElapsed : 0
              )}
            </span>
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => void onStartStop()}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-md transition ${
                runningEntry
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-text-primary hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
              } disabled:opacity-50`}
              title={runningEntry ? "Stop" : "Start"}
            >
              {actionBusy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : runningEntry ? (
                <Square className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-5 w-5 translate-x-0.5 fill-current" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Week summary */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-3 dark:border-zinc-800">
        <div className="flex flex-wrap gap-4 sm:gap-6">
          {weekDays.map((d, i) => {
            const key = localDayKey(d.toISOString());
            const sec = dayTotalsSec[key] ?? 0;
            const active =
              localDayKey(selectedDate.toISOString()) === key;
            return (
              <button
                key={WEEK_DAYS[i]}
                type="button"
                onClick={() => setSelectedDate(new Date(d))}
                className={`text-left ${active ? "border-text-primary dark:border-zinc-100" : "border-transparent"} border-b-2 pb-1`}
              >
                <div className="text-xs font-medium text-text-secondary dark:text-zinc-500">
                  {WEEK_DAYS[i]}
                </div>
                <div
                  className={`text-sm font-semibold tabular-nums ${active ? "text-text-primary dark:text-zinc-100" : "text-text-secondary dark:text-zinc-400"}`}
                >
                  {formatDurationSeconds(sec)}
                </div>
              </button>
            );
          })}
        </div>
        <div className="text-right">
          <div className="text-xs font-medium text-text-secondary dark:text-zinc-500">
            Week Total
          </div>
          <div className="text-lg font-bold tabular-nums text-text-primary dark:text-zinc-100">
            {formatDurationSeconds(weekTotalSec)}
          </div>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <div className="rounded-2xl border border-dashed border-border bg-white/50 px-8 py-16 text-center text-sm text-text-secondary dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
          Calendar view is coming soon. Use the list below for now.
        </div>
      ) : null}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white dark:border-zinc-800 dark:bg-zinc-950/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/80 text-[11px] font-semibold uppercase tracking-wider text-text-secondary dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-500">
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3 text-right">Duration</th>
                <th className="w-12 px-2 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-zinc-800">
              {entriesForSelectedDay.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-text-secondary dark:text-zinc-500"
                  >
                    No time logged this day. Start the timer or pick another
                    day.
                  </td>
                </tr>
              ) : (
                entriesForSelectedDay.map((e) => {
                  const p = e.project_id
                    ? projectById.get(e.project_id)
                    : undefined;
                  const t = e.task_id ? taskById.get(e.task_id) : undefined;
                  const dur = durationSeconds(e, nowMs);
                  return (
                    <tr
                      key={e.id}
                      className="hover:bg-surface/40 dark:hover:bg-zinc-900/40"
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          {e.billable ? (
                            <DollarSign
                              className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                              aria-label="Billable"
                            />
                          ) : null}
                          <span className="font-medium text-text-primary dark:text-zinc-100">
                            {e.description || "—"}
                          </span>
                          {e.tags?.map((tag) => (
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
    </div>
  );
}
