"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DollarSign, FolderOpen, Briefcase, Loader2, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { logMoneyJournalEntry } from "@/app/(crm)/actions/money-journal";
import {
  EMPTY_MONEY_JOURNAL_GOALS,
  MONEY_JOURNAL_TAG,
  type MoneyJournalEntryPayload,
  type MoneyJournalGoals,
  hasHourSpecificContent,
  loadMoneyJournalGoalsForDate,
  saveMoneyJournalGoalsFull,
} from "@/lib/crm/money-journal-types";
import MoneyJournalTimer, {
  type MoneyJournalLogRange,
  type MoneyJournalTimerHandle,
} from "./MoneyJournalTimer";

type ProjectRow = {
  id: string;
  title: string;
  client: { name: string | null; company: string | null; email: string | null } | null;
};

type TaskRow = { id: string; title: string; project_id: string };

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
    const one = Array.isArray(c) ? c[0] ?? null : c;
    return {
      id: p.id,
      title: p.title,
      client: one
        ? { name: one.name, company: one.company, email: one.email }
        : null,
    };
  });
}

const underlineInput =
  "w-full min-w-0 border-0 border-b border-white/30 bg-transparent py-1 text-sm text-white placeholder:text-zinc-500 focus:border-white/80 focus:outline-none focus:ring-0";
const underlineArea =
  "w-full min-w-0 resize-y border-0 border-b border-white/30 bg-transparent py-1 text-sm text-white placeholder:text-zinc-500 focus:border-white/80 focus:outline-none focus:ring-0";

type Props = { today: Date };

export default function PlaybookMoneyJournalTab({ today }: Props) {
  const [goals, setGoals] = useState<MoneyJournalGoals>(() => ({
    ...EMPTY_MONEY_JOURNAL_GOALS,
  }));
  const [prospectingDone, setProspectingDone] = useState("");
  const [moneyPurpose, setMoneyPurpose] = useState("");
  const [workDetail60m, setWorkDetail60m] = useState("");
  const [focusEffortRating, setFocusEffortRating] = useState("");
  const [improveNextHour, setImproveNextHour] = useState("");
  const [promiseKeepGoing, setPromiseKeepGoing] = useState("");
  const [billable, setBillable] = useState(true);
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [completedToday, setCompletedToday] = useState(0);
  const [nextHourN, setNextHourN] = useState(1);
  const [runningTt, setRunningTt] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [needPrompt, setNeedPrompt] = useState(false);
  const timerRef = useRef<MoneyJournalTimerHandle>(null);
  const autoLogDoneRef = useRef(false);
  const formRef = useRef({
    prospectingDone,
    moneyPurpose,
    workDetail60m,
    focusEffortRating,
    improveNextHour,
    promiseKeepGoing,
    billable,
    projectId,
    taskId,
    goals,
  });
  formRef.current = {
    prospectingDone,
    moneyPurpose,
    workDetail60m,
    focusEffortRating,
    improveNextHour,
    promiseKeepGoing,
    billable,
    projectId,
    taskId,
    goals,
  };
  const nextHourNRef = useRef(nextHourN);
  nextHourNRef.current = nextHourN;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setGoals(loadMoneyJournalGoalsForDate(today));
  }, [today]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    saveMoneyJournalGoalsFull(goals, today);
  }, [goals, today]);

  const tasksForProject = useMemo(() => {
    if (!projectId.trim()) return tasks;
    return tasks.filter((t) => t.project_id === projectId);
  }, [tasks, projectId]);

  const refreshMeta = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoadErr("Supabase is not configured.");
      return;
    }
    setLoadErr(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoadErr("Sign in to use the journal.");
      return;
    }

    const d0 = new Date(today);
    d0.setHours(0, 0, 0, 0);
    const d1 = new Date(today);
    d1.setHours(23, 59, 59, 999);

    const [pRes, tRes, dayRes, runRes] = await Promise.all([
      supabase
        .from("project")
        .select("id, title, client:client_id ( name, company, email )")
        .not("parent_project_id", "is", null)
        .order("title")
        .limit(300),
      supabase.from("task").select("id, title, project_id").order("title").limit(500),
      supabase
        .from("time_entry")
        .select("id, tags, journal_data, started_at")
        .eq("user_id", user.id)
        .gte("started_at", d0.toISOString())
        .lte("started_at", d1.toISOString()),
      supabase
        .from("time_entry")
        .select("id")
        .eq("user_id", user.id)
        .is("ended_at", null)
        .maybeSingle(),
    ]);

    if (pRes.error) setLoadErr(pRes.error.message);
    else if (tRes.error) setLoadErr(tRes.error.message);
    else {
      setProjects(projectsFromQuery(pRes.data as ProjectQueryRow[] | null));
      setTasks((tRes.data ?? []) as TaskRow[]);
    }
    if (dayRes.error) setLoadErr(dayRes.error.message);
    else if (runRes.error) setLoadErr(runRes.error.message);

    setRunningTt(Boolean(runRes.data?.id));
    if (dayRes.data) {
      const rows = dayRes.data as { tags?: string[]; journal_data?: unknown }[];
      const n = rows.filter(
        (r) => r.journal_data != null || r.tags?.includes(MONEY_JOURNAL_TAG)
      ).length;
      setCompletedToday(n);
      setNextHourN(n + 1);
    }
  }, [today]);

  useEffect(() => {
    void refreshMeta();
  }, [refreshMeta]);

  const clearHourFields = useCallback(() => {
    setProspectingDone("");
    setMoneyPurpose("");
    setWorkDetail60m("");
    setFocusEffortRating("");
    setImproveNextHour("");
    setPromiseKeepGoing("");
    setNeedPrompt(false);
    autoLogDoneRef.current = false;
  }, []);

  const doLog = useCallback(
    async (range: MoneyJournalLogRange | null) => {
      if (!range) {
        setErr("Start the timer, or work until at least 30s elapsed, then try again.");
        return;
      }
      const f = formRef.current;
      const bits = {
        prospectingDone: f.prospectingDone,
        moneyPurpose: f.moneyPurpose,
        workDetail60m: f.workDetail60m,
        focusEffortRating: f.focusEffortRating,
        improveNextHour: f.improveNextHour,
        promiseKeepGoing: f.promiseKeepGoing,
      };
      const h = hasHourSpecificContent(bits);
      if (!h) {
        setErr("Fill in what you did this hour before logging.");
        return;
      }
      setSaving(true);
      setMsg(null);
      setErr(null);
      const payload: MoneyJournalEntryPayload = {
        hourNumber: nextHourNRef.current,
        prospectingDone: f.prospectingDone.trim(),
        startTimeLabel: range.startLabel,
        stopTimeLabel: range.stopLabel,
        moneyPurpose: f.moneyPurpose.trim(),
        workDetail60m: f.workDetail60m.trim(),
        focusEffortRating: f.focusEffortRating.trim(),
        improveNextHour: f.improveNextHour.trim(),
        promiseKeepGoing: f.promiseKeepGoing.trim(),
        billable: f.billable,
        projectId: f.projectId.trim() || null,
        taskId: f.taskId.trim() || null,
        goalsSnapshot: { ...f.goals },
      };
      const res = await logMoneyJournalEntry({
        startedAtIso: new Date(range.startMs).toISOString(),
        endedAtIso: new Date(range.endMs).toISOString(),
        journalData: payload,
      });
      setSaving(false);
      if ("error" in res && res.error) {
        setErr(res.error);
        return;
      }
      if ("ok" in res && res.ok) {
        setErr(null);
        setMsg("Logged. View in Time Tracking.");
        clearHourFields();
        timerRef.current?.reset();
        void refreshMeta();
      }
    },
    [clearHourFields, refreshMeta]
  );

  const onTimerCountdownComplete = useCallback(() => {
    if (autoLogDoneRef.current) return;
    const f = formRef.current;
    const h = hasHourSpecificContent({
      prospectingDone: f.prospectingDone,
      moneyPurpose: f.moneyPurpose,
      workDetail60m: f.workDetail60m,
      focusEffortRating: f.focusEffortRating,
      improveNextHour: f.improveNextHour,
      promiseKeepGoing: f.promiseKeepGoing,
    });
    const r = timerRef.current?.getLastCompleteLogRange() ?? null;
    if (h && r) {
      autoLogDoneRef.current = true;
      void doLog(r);
    } else {
      setNeedPrompt(true);
    }
  }, [doLog]);

  const onManualLog = useCallback(() => {
    const r = timerRef.current?.getLogRange() ?? null;
    void doLog(r);
  }, [doLog]);

  if (!isSupabaseConfigured()) {
    return (
      <p className="text-sm text-text-secondary">
        Configure Supabase to save journal hours to time tracking.
      </p>
    );
  }

  if (loadErr && !projects.length) {
    return <p className="text-sm text-red-600 dark:text-red-400">{loadErr}</p>;
  }

  return (
    <div className="space-y-6">
      {loadErr && projects.length > 0 ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2 text-sm text-red-800 dark:text-red-200/90">
          {loadErr}
        </p>
      ) : null}
      {runningTt ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-sm text-amber-900 dark:text-amber-100/90">
          Time Tracking has a separate timer running; this journal hour is
          still saved as its own 1h block.
        </p>
      ) : null}
      {needPrompt ? (
        <p className="rounded-xl border border-sky-500/30 bg-sky-500/5 px-4 py-2 text-sm text-sky-900 dark:text-sky-100/90">
          Fill in your journal to save this hour, then use{" "}
          <span className="font-semibold">Log this hour</span>.
        </p>
      ) : null}
      {err ? <p className="text-sm text-red-600 dark:text-red-400">{err}</p> : null}
      {msg ? (
        <p className="flex flex-wrap items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300/90">
          {msg}
          <Link
            href="/time-tracking"
            className="inline-flex items-center gap-1 font-medium text-accent underline-offset-2 hover:underline dark:text-blue-400"
          >
            Open Time Tracking
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </p>
      ) : null}

      <div className="rounded-2xl border border-zinc-800 bg-black px-4 py-8 text-white shadow-xl sm:px-8">
        <h2 className="font-serif text-3xl font-normal tracking-tight text-white sm:text-4xl">
          Money Journal
        </h2>
        <p className="mt-3 text-sm text-zinc-400">
          The standard is that you will work for five hours per day using a
          timer, and filling out this form after each hour.
        </p>

        <div className="mt-8 space-y-3 text-sm">
          <p className="text-zinc-300">
            What is your one main goal you want to achieve by the end of 2026
            (major definite purpose)?
          </p>
          <input
            className={underlineInput}
            value={goals.majorDefinitePurpose}
            onChange={(e) =>
              setGoals((g) => ({ ...g, majorDefinitePurpose: e.target.value }))
            }
            placeholder="Write your 2026 purpose"
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="min-w-0 flex-1 sm:max-w-[12rem]">
              <span className="text-xs text-zinc-500">North goal: Make</span>
              <input
                className={underlineInput + " mt-0.5"}
                value={goals.northGoalAmount}
                onChange={(e) =>
                  setGoals((g) => ({ ...g, northGoalAmount: e.target.value }))
                }
                placeholder="amount"
              />
            </label>
            <span className="hidden text-zinc-500 sm:pb-1 sm:inline">by Dec 31</span>
            <label className="min-w-0 flex-1 sm:max-w-[10rem]">
              <span className="text-xs text-zinc-500">Project</span>
              <input
                className={underlineInput + " mt-0.5"}
                value={goals.northGoalProject}
                onChange={(e) =>
                  setGoals((g) => ({ ...g, northGoalProject: e.target.value }))
                }
                placeholder="Project"
              />
            </label>
            <label className="min-w-0 flex-1 sm:max-w-[9rem]">
              <span className="text-xs text-zinc-500">Date</span>
              <input
                className={underlineInput + " mt-0.5"}
                value={goals.northGoalDate}
                onChange={(e) =>
                  setGoals((g) => ({ ...g, northGoalDate: e.target.value }))
                }
                placeholder="Dec 31, 2026"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="min-w-0 flex-1 sm:max-w-[12rem]">
              <span className="text-xs text-zinc-500">Quarter goal: Make</span>
              <input
                className={underlineInput + " mt-0.5"}
                value={goals.quarterGoalAmount}
                onChange={(e) =>
                  setGoals((g) => ({ ...g, quarterGoalAmount: e.target.value }))
                }
                placeholder="by Mar 31"
              />
            </label>
            <label className="min-w-0 flex-1 sm:max-w-md">
              <span className="text-xs text-zinc-500">Day goal</span>
              <input
                className={underlineInput + " mt-0.5"}
                value={goals.dayGoal}
                onChange={(e) => setGoals((g) => ({ ...g, dayGoal: e.target.value }))}
                placeholder="Today's target"
              />
            </label>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label>
              <span className="text-xs text-zinc-500">Progress (done)</span>
              <input
                className={underlineInput + " mt-0.5"}
                value={goals.progressDone}
                onChange={(e) =>
                  setGoals((g) => ({ ...g, progressDone: e.target.value }))
                }
              />
            </label>
            <label>
              <span className="text-xs text-zinc-500">of</span>
              <input
                className={underlineInput + " mt-0.5"}
                value={goals.progressTotal}
                onChange={(e) =>
                  setGoals((g) => ({ ...g, progressTotal: e.target.value }))
                }
              />
            </label>
            <label className="sm:col-span-2 lg:col-span-1">
              <span className="text-xs text-zinc-500">Make today</span>
              <input
                className={underlineInput + " mt-0.5"}
                value={goals.makeToday}
                onChange={(e) => setGoals((g) => ({ ...g, makeToday: e.target.value }))}
              />
            </label>
            <label>
              <span className="text-xs text-zinc-500">$ Money made</span>
              <input
                className={underlineInput + " mt-0.5"}
                value={goals.moneyMadeToday}
                onChange={(e) =>
                  setGoals((g) => ({ ...g, moneyMadeToday: e.target.value }))
                }
              />
            </label>
            <label>
              <span className="text-xs text-zinc-500">Hours worked</span>
              <input
                className={underlineInput + " mt-0.5"}
                value={goals.hoursWorkedToday}
                onChange={(e) =>
                  setGoals((g) => ({ ...g, hoursWorkedToday: e.target.value }))
                }
              />
            </label>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-end gap-3">
              <span className="text-zinc-400">Hour</span>
              <span className="text-lg font-medium tabular-nums text-white">
                {nextHourN}
              </span>
            </div>
            <label>
              <span className="text-xs text-zinc-500">Prospecting done</span>
              <input
                className={underlineInput + " mt-0.5"}
                value={prospectingDone}
                onChange={(e) => setProspectingDone(e.target.value)}
                placeholder="Calls, DMs, etc."
              />
            </label>
            <p className="pt-2 text-zinc-500">Start / stop your hour below.</p>
            <label className="block">
              <span className="text-xs text-zinc-500">I will use the money for</span>
              <textarea
                className={underlineArea + " mt-1 min-h-[4rem]"}
                value={moneyPurpose}
                onChange={(e) => setMoneyPurpose(e.target.value)}
                rows={2}
              />
            </label>
          </div>
          <MoneyJournalTimer
            ref={timerRef}
            completedHoursToday={completedToday}
            onCountdownComplete={onTimerCountdownComplete}
          />
        </div>

        <div className="mt-8 space-y-2 border-t border-white/10 pt-8 text-sm">
          <p className="font-medium text-white">
            What did you do during <strong>this 60 minutes</strong>? Be detailed.
          </p>
          <textarea
            className={underlineArea + " min-h-[5rem]"}
            value={workDetail60m}
            onChange={(e) => setWorkDetail60m(e.target.value)}
            rows={3}
          />
        </div>
        <div className="mt-6 space-y-2">
          <p className="text-sm text-zinc-300">
            What would you rate your focus and effort out of 10? Why?
          </p>
          <textarea
            className={underlineArea + " min-h-[3.5rem]"}
            value={focusEffortRating}
            onChange={(e) => setFocusEffortRating(e.target.value)}
            rows={2}
          />
        </div>
        <div className="mt-6 space-y-2">
          <p className="text-sm text-zinc-300">
            What can you do so your effort + focus is better next hour?
          </p>
          <textarea
            className={underlineArea + " min-h-[3.5rem]"}
            value={improveNextHour}
            onChange={(e) => setImproveNextHour(e.target.value)}
            rows={2}
          />
        </div>
        <p className="mt-8 text-sm leading-relaxed text-zinc-500">
          With every hour you complete, you are rewiring your brain and
          becoming someone capable of getting 10x as much done as you used to.
        </p>
        <div className="mt-4 space-y-2">
          <p className="text-sm text-zinc-300">Do you promise to keep going?</p>
          <input
            className={underlineInput}
            value={promiseKeepGoing}
            onChange={(e) => setPromiseKeepGoing(e.target.value)}
            placeholder="Yes / commitment"
          />
        </div>

        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Link to work
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setBillable((b) => !b)}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
                billable
                  ? "border-emerald-600/50 bg-emerald-950/40 text-emerald-200"
                  : "border-zinc-600 bg-zinc-900/80 text-zinc-400"
              }`}
            >
              <DollarSign className="h-4 w-4" />
              {billable ? "Billable" : "Non-billable"}
            </button>
            <div />
            <label className="sm:col-span-2">
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <Briefcase className="h-3.5 w-3.5" /> Project
              </span>
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setTaskId("");
                }}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-white outline-none focus:border-white/30"
              >
                <option value="">Select phase…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <FolderOpen className="h-3.5 w-3.5" /> Task
              </span>
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                disabled={!projectId}
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-white outline-none focus:border-white/30 disabled:opacity-50"
              >
                <option value="">Select task…</option>
                {tasksForProject.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={onManualLog}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Log this hour
          </button>
        </div>
      </div>
    </div>
  );
}
