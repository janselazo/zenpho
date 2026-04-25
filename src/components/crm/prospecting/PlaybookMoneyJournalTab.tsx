"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Briefcase,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  FolderOpen,
  Loader2,
  Target,
  TimerReset,
} from "lucide-react";
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

const inputClass =
  "w-full min-w-0 rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5 text-sm text-white shadow-inner outline-none transition placeholder:text-zinc-600 focus:border-teal-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-teal-400/10";
const areaClass =
  "w-full min-w-0 resize-y rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5 text-sm leading-relaxed text-white shadow-inner outline-none transition placeholder:text-zinc-600 focus:border-teal-400/50 focus:bg-white/[0.07] focus:ring-2 focus:ring-teal-400/10";
const labelClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500";
const sectionClass =
  "rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-sm ring-1 ring-white/[0.03] sm:p-5";

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

  const todayLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-5">
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

      <div className="overflow-hidden rounded-[1.75rem] border border-zinc-800 bg-[#050505] text-white shadow-2xl ring-1 ring-white/[0.04]">
        <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.22),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_45%)] px-5 py-6 sm:px-7 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/25 bg-teal-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-teal-200">
                <BookOpen className="h-3.5 w-3.5" />
                Money Journal
              </div>
              <h2 className="mt-4 font-serif text-3xl font-normal tracking-tight text-white sm:text-4xl">
                Track the hour, capture the lesson.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
                Work in focused 60-minute blocks, then log exactly what moved
                you forward. Your completed hours sync to Time Tracking.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[24rem]">
              <div className="rounded-2xl border border-white/10 bg-black/35 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Today
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-100">
                  {todayLabel}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/35 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Logged
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-teal-200">
                  {completedToday}/5
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/35 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Next
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-white">
                  Hour {nextHourN}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_25rem] lg:p-8">
          <div className="space-y-5">
            <section className={sectionClass}>
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-400/10 text-teal-300 ring-1 ring-teal-400/20">
                  <Target className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Purpose and targets
                  </h3>
                  <p className="text-xs text-zinc-500">
                    These stay filled in for the day so each hour is faster.
                  </p>
                </div>
              </div>

              <label>
                <span className={labelClass}>Major definite purpose</span>
                <textarea
                  className={areaClass + " min-h-[4.25rem]"}
                  value={goals.majorDefinitePurpose}
                  onChange={(e) =>
                    setGoals((g) => ({
                      ...g,
                      majorDefinitePurpose: e.target.value,
                    }))
                  }
                  placeholder="What is your one main goal by the end of 2026?"
                  rows={2}
                />
              </label>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <label>
                  <span className={labelClass}>North goal</span>
                  <input
                    className={inputClass}
                    value={goals.northGoalAmount}
                    onChange={(e) =>
                      setGoals((g) => ({
                        ...g,
                        northGoalAmount: e.target.value,
                      }))
                    }
                    placeholder="Make..."
                  />
                </label>
                <label>
                  <span className={labelClass}>Project</span>
                  <input
                    className={inputClass}
                    value={goals.northGoalProject}
                    onChange={(e) =>
                      setGoals((g) => ({
                        ...g,
                        northGoalProject: e.target.value,
                      }))
                    }
                    placeholder="Project"
                  />
                </label>
                <label>
                  <span className={labelClass}>Target date</span>
                  <input
                    className={inputClass}
                    value={goals.northGoalDate}
                    onChange={(e) =>
                      setGoals((g) => ({
                        ...g,
                        northGoalDate: e.target.value,
                      }))
                    }
                    placeholder="Dec 31, 2026"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label>
                  <span className={labelClass}>Quarter goal</span>
                  <input
                    className={inputClass}
                    value={goals.quarterGoalAmount}
                    onChange={(e) =>
                      setGoals((g) => ({
                        ...g,
                        quarterGoalAmount: e.target.value,
                      }))
                    }
                    placeholder="Make by Mar 31"
                  />
                </label>
                <label>
                  <span className={labelClass}>Day goal</span>
                  <input
                    className={inputClass}
                    value={goals.dayGoal}
                    onChange={(e) =>
                      setGoals((g) => ({ ...g, dayGoal: e.target.value }))
                    }
                    placeholder="Today's target"
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <label>
                  <span className={labelClass}>Progress</span>
                  <input
                    className={inputClass}
                    value={goals.progressDone}
                    onChange={(e) =>
                      setGoals((g) => ({
                        ...g,
                        progressDone: e.target.value,
                      }))
                    }
                    placeholder="Done"
                  />
                </label>
                <label>
                  <span className={labelClass}>Of</span>
                  <input
                    className={inputClass}
                    value={goals.progressTotal}
                    onChange={(e) =>
                      setGoals((g) => ({
                        ...g,
                        progressTotal: e.target.value,
                      }))
                    }
                    placeholder="Total"
                  />
                </label>
                <label>
                  <span className={labelClass}>Make today</span>
                  <input
                    className={inputClass}
                    value={goals.makeToday}
                    onChange={(e) =>
                      setGoals((g) => ({ ...g, makeToday: e.target.value }))
                    }
                    placeholder="$ / result"
                  />
                </label>
                <label>
                  <span className={labelClass}>Money made</span>
                  <input
                    className={inputClass}
                    value={goals.moneyMadeToday}
                    onChange={(e) =>
                      setGoals((g) => ({
                        ...g,
                        moneyMadeToday: e.target.value,
                      }))
                    }
                    placeholder="$"
                  />
                </label>
                <label>
                  <span className={labelClass}>Hours</span>
                  <input
                    className={inputClass}
                    value={goals.hoursWorkedToday}
                    onChange={(e) =>
                      setGoals((g) => ({
                        ...g,
                        hoursWorkedToday: e.target.value,
                      }))
                    }
                    placeholder="0"
                  />
                </label>
              </div>
            </section>

            <section className={sectionClass}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/8 text-zinc-200 ring-1 ring-white/10">
                    <TimerReset className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Hour {nextHourN} reflection
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Fill this while or after the timer runs.
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-300">
                  60 min
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <label>
                  <span className={labelClass}>Prospecting done</span>
                  <input
                    className={inputClass}
                    value={prospectingDone}
                    onChange={(e) => setProspectingDone(e.target.value)}
                    placeholder="Calls, DMs, follow-ups..."
                  />
                </label>
                <label>
                  <span className={labelClass}>I will use the money for</span>
                  <input
                    className={inputClass}
                    value={moneyPurpose}
                    onChange={(e) => setMoneyPurpose(e.target.value)}
                    placeholder="Why this hour matters"
                  />
                </label>
              </div>

              <label className="mt-4 block">
                <span className={labelClass}>
                  What did you do during this 60 minutes?
                </span>
                <textarea
                  className={areaClass + " min-h-[8rem]"}
                  value={workDetail60m}
                  onChange={(e) => setWorkDetail60m(e.target.value)}
                  placeholder="Be specific: tasks completed, people contacted, deliverables moved, blockers removed..."
                  rows={5}
                />
              </label>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label>
                  <span className={labelClass}>Focus and effort</span>
                  <textarea
                    className={areaClass + " min-h-[5rem]"}
                    value={focusEffortRating}
                    onChange={(e) => setFocusEffortRating(e.target.value)}
                    placeholder="Example: 8/10 — clear focus, one distraction..."
                    rows={3}
                  />
                </label>
                <label>
                  <span className={labelClass}>Better next hour</span>
                  <textarea
                    className={areaClass + " min-h-[5rem]"}
                    value={improveNextHour}
                    onChange={(e) => setImproveNextHour(e.target.value)}
                    placeholder="What adjustment will make the next block stronger?"
                    rows={3}
                  />
                </label>
              </div>

              <div className="mt-4 rounded-2xl border border-teal-400/15 bg-teal-400/[0.06] p-4">
                <p className="text-sm leading-relaxed text-teal-50/85">
                  With every hour you complete, you are rewiring your brain and
                  becoming someone capable of getting 10x as much done as you
                  used to.
                </p>
                <label className="mt-3 block">
                  <span className={labelClass}>Promise to keep going</span>
                  <input
                    className={inputClass}
                    value={promiseKeepGoing}
                    onChange={(e) => setPromiseKeepGoing(e.target.value)}
                    placeholder="Yes — I keep going."
                  />
                </label>
              </div>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <MoneyJournalTimer
              ref={timerRef}
              completedHoursToday={completedToday}
              onCountdownComplete={onTimerCountdownComplete}
            />

            <section className={sectionClass}>
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Save to Time Tracking
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Link the hour to work before logging.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBillable((b) => !b)}
                className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  billable
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200 shadow-[0_0_0_1px_rgba(52,211,153,0.08)]"
                    : "border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/[0.07]"
                }`}
              >
                <DollarSign className="h-4 w-4" />
                {billable ? "Billable" : "Non-billable"}
              </button>

              <div className="mt-4 space-y-3">
                <label>
                  <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    <Briefcase className="h-3.5 w-3.5" /> Project
                  </span>
                  <select
                    value={projectId}
                    onChange={(e) => {
                      setProjectId(e.target.value);
                      setTaskId("");
                    }}
                    className={inputClass}
                  >
                    <option value="">Select phase...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    <FolderOpen className="h-3.5 w-3.5" /> Task
                  </span>
                  <select
                    value={taskId}
                    onChange={(e) => setTaskId(e.target.value)}
                    disabled={!projectId}
                    className={inputClass + " disabled:cursor-not-allowed disabled:opacity-50"}
                  >
                    <option value="">Select task...</option>
                    {tasksForProject.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={onManualLog}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black shadow-lg shadow-white/5 transition hover:bg-zinc-200 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Log this hour
              </button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
