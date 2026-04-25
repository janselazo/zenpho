"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  ExternalLink,
  FolderOpen,
  Layers,
  Loader2,
  TimerReset,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { logMoneyJournalEntry } from "@/app/(crm)/actions/money-journal";
import {
  EMPTY_MONEY_JOURNAL_GOALS,
  MONEY_JOURNAL_TAG,
  type MoneyJournalEntryPayload,
  hasHourSpecificContent,
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

type PhaseRow = { id: string; title: string; parent_project_id: string };

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

/** Map Journal "phase or task" value to time_entry project_id / task_id. */
function resolveTimeEntryProjectTask(
  workLink: string,
  tasks: TaskRow[]
): { projectId: string; taskId: string } {
  if (!workLink) return { projectId: "", taskId: "" };
  if (workLink.startsWith("task:")) {
    const tid = workLink.slice(5);
    const task = tasks.find((t) => t.id === tid);
    if (task) return { projectId: task.project_id, taskId: tid };
    return { projectId: "", taskId: "" };
  }
  if (workLink.startsWith("proj:")) {
    return { projectId: workLink.slice(5), taskId: "" };
  }
  return { projectId: "", taskId: "" };
}

const inputClass =
  "w-full min-w-0 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-text-primary shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/15 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100 dark:placeholder:text-zinc-600";
const areaClass =
  "w-full min-w-0 resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-text-primary shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/15 dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-100 dark:placeholder:text-zinc-600";
const labelClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary/80 dark:text-zinc-500";
const sectionClass =
  "rounded-2xl border border-border bg-white p-4 shadow-sm ring-1 ring-black/[0.03] dark:border-zinc-800 dark:bg-zinc-950/70 dark:ring-white/[0.04] sm:p-5";

type JournalPamphletRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  journal: MoneyJournalEntryPayload;
};

function parseJournalPayload(v: unknown): MoneyJournalEntryPayload | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.hourNumber !== "number" || typeof o.workDetail60m !== "string")
    return null;
  return v as MoneyJournalEntryPayload;
}

function previewLine(text: string, max: number) {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function JournalPergaminoLeaves({ entries }: { entries: JournalPamphletRow[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-text-secondary/90 dark:text-zinc-500">
        Finished hours will appear here as parchment leaves, newest on top, so
        you can open any past block and re-read it.
      </p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {entries.map((row, index) => {
        const j = row.journal;
        const d = new Date(row.started_at);
        const dateStr = d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          ...(d.getFullYear() !== new Date().getFullYear()
            ? { year: "numeric" as const }
            : {}),
        });
        const stackZ = entries.length - index;
        return (
          <li
            key={row.id}
            style={{ zIndex: stackZ }}
            className={`relative ${
              index % 2 === 0 ? "sm:pl-0" : "sm:pl-3"
            } transition-transform hover:sm:translate-x-0.5`}
          >
            <details
              className="group rounded-lg border border-amber-200/90 bg-gradient-to-b from-amber-50/98 via-amber-50/90 to-amber-100/85 text-amber-950 shadow-[0_1px_0_0_rgba(255,255,255,0.5),inset_0_1px_0_0_rgba(255,255,255,0.35),2px_3px_8px_rgba(120,83,20,0.12)] dark:border-amber-900/50 dark:from-amber-950/50 dark:via-zinc-900/70 dark:to-zinc-950/80 dark:text-amber-50/95 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
            >
              <summary className="cursor-pointer list-none px-3 py-2.5 pr-8 text-left [&::-webkit-details-marker]:hidden">
                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                  <span className="font-serif text-sm font-semibold tracking-tight text-amber-950/95 dark:text-amber-100">
                    Hour {j.hourNumber}
                    <span className="font-sans text-[11px] font-normal text-amber-800/80 dark:text-amber-200/70">
                      {" "}
                      · {dateStr}
                    </span>
                  </span>
                  <span className="font-sans text-[11px] text-amber-800/80 dark:text-amber-300/80">
                    {j.startTimeLabel} – {j.stopTimeLabel}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 font-sans text-xs leading-snug text-amber-900/90 dark:text-amber-100/80">
                  {previewLine(j.workDetail60m, 200)}
                </p>
                <ChevronDown
                  className="pointer-events-none absolute right-2.5 top-3 h-3.5 w-3.5 text-amber-700/50 transition group-open:rotate-180 dark:text-amber-400/45"
                  aria-hidden
                />
              </summary>
              <div className="space-y-2.5 border-t border-amber-200/60 px-3 py-3 text-xs leading-relaxed text-amber-950/95 dark:border-amber-800/50 dark:text-amber-50/90">
                <PergField label="Prospecting" value={j.prospectingDone || "—"} />
                <PergField label="Money for" value={j.moneyPurpose || "—"} />
                <PergField label="This hour" value={j.workDetail60m || "—"} multiline />
                <PergField label="Focus" value={j.focusEffortRating || "—"} multiline />
                <PergField label="Next hour" value={j.improveNextHour || "—"} multiline />
                <PergField label="Promise" value={j.promiseKeepGoing || "—"} />
                <p className="pt-0.5 text-[11px] text-amber-800/70 dark:text-amber-400/60">
                  {j.billable ? "Billable" : "Non-billable"}
                </p>
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}

function PergField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-800/70 dark:text-amber-400/60">
        {label}
      </p>
      <p
        className={`mt-0.5 whitespace-pre-wrap text-[13px] ${
          multiline ? "" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

type Props = { today: Date };

export default function PlaybookMoneyJournalTab({ today }: Props) {
  const [prospectingDone, setProspectingDone] = useState(false);
  const [moneyPurpose, setMoneyPurpose] = useState("");
  const [workDetail60m, setWorkDetail60m] = useState("");
  const [focusEffortRating, setFocusEffortRating] = useState("");
  const [improveNextHour, setImproveNextHour] = useState("");
  const [promiseKeepGoing, setPromiseKeepGoing] = useState("");
  const [billable, setBillable] = useState(true);
  /** Root product (Work → Products). */
  const [productId, setProductId] = useState("");
  /** `proj:uuid` = phase or entire product; `task:uuid` = task. */
  const [workLink, setWorkLink] = useState("");

  const [products, setProducts] = useState<ProjectRow[]>([]);
  const [phases, setPhases] = useState<PhaseRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [completedToday, setCompletedToday] = useState(0);
  const [nextHourN, setNextHourN] = useState(1);
  const [runningTt, setRunningTt] = useState(false);
  const [pamphletEntries, setPamphletEntries] = useState<JournalPamphletRow[]>(
    []
  );
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
    projectId: "",
    taskId: "",
  });
  const timeEntryIds = useMemo(
    () => resolveTimeEntryProjectTask(workLink, tasks),
    [workLink, tasks]
  );
  formRef.current = {
    prospectingDone,
    moneyPurpose,
    workDetail60m,
    focusEffortRating,
    improveNextHour,
    promiseKeepGoing,
    billable,
    projectId: timeEntryIds.projectId,
    taskId: timeEntryIds.taskId,
  };
  const nextHourNRef = useRef(nextHourN);
  nextHourNRef.current = nextHourN;

  const phasesForProduct = useMemo(() => {
    if (!productId) return [];
    return phases
      .filter((p) => p.parent_project_id === productId)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [phases, productId]);

  const tasksForProduct = useMemo(() => {
    if (!productId) return [];
    const allowed = new Set<string>([productId, ...phasesForProduct.map((p) => p.id)]);
    return tasks
      .filter((t) => allowed.has(t.project_id))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [tasks, productId, phasesForProduct]);

  const selectedProductTitle = useMemo(
    () => products.find((p) => p.id === productId)?.title ?? "Product",
    [products, productId]
  );

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

    const lookback = new Date();
    lookback.setDate(lookback.getDate() - 120);
    lookback.setHours(0, 0, 0, 0);

    const [pRoot, pPhases, tRes, dayRes, runRes, histRes] = await Promise.all([
      supabase
        .from("project")
        .select("id, title, client:client_id ( name, company, email )")
        .is("parent_project_id", null)
        .order("title")
        .limit(300),
      supabase
        .from("project")
        .select("id, title, parent_project_id")
        .not("parent_project_id", "is", null)
        .order("title")
        .limit(500),
      supabase
        .from("task")
        .select("id, title, project_id")
        .order("title")
        .limit(1000),
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
      supabase
        .from("time_entry")
        .select("id, started_at, ended_at, journal_data")
        .eq("user_id", user.id)
        .not("journal_data", "is", null)
        .gte("started_at", lookback.toISOString())
        .order("started_at", { ascending: false })
        .limit(100),
    ]);

    if (pRoot.error) setLoadErr(pRoot.error.message);
    else if (pPhases.error) setLoadErr(pPhases.error.message);
    else if (tRes.error) setLoadErr(tRes.error.message);
    else {
      setProducts(projectsFromQuery(pRoot.data as ProjectQueryRow[] | null));
      setPhases((pPhases.data ?? []) as PhaseRow[]);
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

    if (!histRes.error && histRes.data) {
      const rows = histRes.data as {
        id: string;
        started_at: string;
        ended_at: string | null;
        journal_data: unknown;
      }[];
      const list: JournalPamphletRow[] = [];
      for (const r of rows) {
        const journal = parseJournalPayload(r.journal_data);
        if (journal) {
          list.push({
            id: r.id,
            started_at: r.started_at,
            ended_at: r.ended_at,
            journal,
          });
        }
      }
      setPamphletEntries(list);
    }
  }, [today]);

  useEffect(() => {
    void refreshMeta();
  }, [refreshMeta]);

  const clearHourFields = useCallback(() => {
    setProspectingDone(false);
    setMoneyPurpose("");
    setWorkDetail60m("");
    setFocusEffortRating("");
    setImproveNextHour("");
    setPromiseKeepGoing("");
    setNeedPrompt(false);
    autoLogDoneRef.current = false;
    setProductId("");
    setWorkLink("");
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
        prospectingDone: f.prospectingDone ? "Yes" : "",
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
        goalsSnapshot: { ...EMPTY_MONEY_JOURNAL_GOALS },
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

  if (loadErr && !products.length) {
    return <p className="text-sm text-red-600 dark:text-red-400">{loadErr}</p>;
  }

  const todayLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-5">
      {loadErr && products.length > 0 ? (
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

      <div className="overflow-hidden rounded-[1.75rem] border border-border bg-zinc-50/80 text-text-primary shadow-sm ring-1 ring-black/[0.03] dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-100 dark:ring-white/[0.04]">
        <div className="border-b border-border bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.82))] px-5 py-6 dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_34%),linear-gradient(135deg,rgba(24,24,27,0.95),rgba(9,9,11,0.84))] sm:px-7 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent dark:border-blue-400/25 dark:bg-blue-400/10 dark:text-blue-300">
                <BookOpen className="h-3.5 w-3.5" />
                Money Journal
              </div>
              <h2 className="mt-4 font-serif text-3xl font-normal tracking-tight text-text-primary dark:text-zinc-50 sm:text-4xl">
                Track the hour, capture the lesson.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-secondary dark:text-zinc-400">
                Work in focused 60-minute blocks, then log exactly what moved
                you forward. Your completed hours sync to Time Tracking.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[24rem]">
              <div className="rounded-2xl border border-border bg-white/85 px-3 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary/80 dark:text-zinc-500">
                  Today
                </p>
                <p className="mt-1 text-sm font-semibold text-text-primary dark:text-zinc-100">
                  {todayLabel}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-white/85 px-3 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary/80 dark:text-zinc-500">
                  Logged
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-accent dark:text-blue-300">
                  {completedToday}/5
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-white/85 px-3 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-secondary/80 dark:text-zinc-500">
                  Next
                </p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-text-primary dark:text-zinc-50">
                  Hour {nextHourN}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_25rem] lg:p-8">
          <div className="space-y-5">
            <section
              className={`${sectionClass} overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_32%),linear-gradient(180deg,#ffffff,#f8fafc)] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_32%),linear-gradient(180deg,rgba(24,24,27,0.95),rgba(9,9,11,0.86))]`}
            >
              <div className="mb-5 flex items-start gap-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/15 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/25">
                  <TimerReset className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-text-primary dark:text-zinc-100">
                    Hour {nextHourN}: what moved forward?
                  </h3>
                  <p className="mt-1 text-sm text-text-secondary dark:text-zinc-500">
                    Capture the work, your focus, and the adjustment for the
                    next block.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 md:items-start">
                <label>
                  <span className={labelClass}>I will use the money for</span>
                  <input
                    className={inputClass}
                    value={moneyPurpose}
                    onChange={(e) => setMoneyPurpose(e.target.value)}
                    placeholder="Why this hour matters"
                  />
                </label>
                <div>
                  <span className={labelClass}>Prospecting done</span>
                  <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/80 dark:hover:bg-zinc-800/80">
                    <input
                      type="checkbox"
                      checked={prospectingDone}
                      onChange={(e) => setProspectingDone(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 accent-emerald-600 focus:ring-2 focus:ring-emerald-500/35 dark:border-zinc-600 dark:bg-zinc-900 dark:accent-emerald-500 dark:focus:ring-emerald-500/30"
                    />
                    <span className="text-sm leading-snug text-text-primary dark:text-zinc-100">
                      I completed prospecting this hour (calls, DMs, follow-ups,
                      etc.)
                    </span>
                  </label>
                </div>
              </div>

              <label className="mt-4 block">
                <span className={labelClass}>
                  What did you do during this 60 minutes?
                </span>
                <textarea
                  className={areaClass + " min-h-[12rem] text-base"}
                  value={workDetail60m}
                  onChange={(e) => setWorkDetail60m(e.target.value)}
                  placeholder="Be specific: tasks completed, people contacted, deliverables moved, blockers removed..."
                  rows={7}
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

              <div className="mt-4 rounded-2xl border border-accent/15 bg-accent/5 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                <p className="text-sm leading-relaxed text-text-primary dark:text-blue-50/85">
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
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/25">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
                    Save to Time Tracking
                  </h3>
                  <p className="text-xs text-text-secondary dark:text-zinc-500">
                    Link the hour to work before logging.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBillable((b) => !b)}
                className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  billable
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200"
                    : "border-border bg-white text-text-secondary hover:bg-surface dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                <DollarSign className="h-4 w-4" />
                {billable ? "Billable" : "Non-billable"}
              </button>

              <div className="mt-4 space-y-3">
                <label>
                  <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary/80 dark:text-zinc-500">
                    <Briefcase className="h-3.5 w-3.5" /> Product
                  </span>
                  <select
                    value={productId}
                    onChange={(e) => {
                      setProductId(e.target.value);
                      setWorkLink("");
                    }}
                    className={inputClass}
                  >
                    <option value="">Select product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary/80 dark:text-zinc-500">
                    <FolderOpen className="h-3.5 w-3.5" /> Phase or task
                  </span>
                  <select
                    value={workLink}
                    onChange={(e) => setWorkLink(e.target.value)}
                    disabled={!productId}
                    className={inputClass + " disabled:cursor-not-allowed disabled:opacity-50"}
                  >
                    <option value="">
                      {productId
                        ? "Select phase, whole product, or task…"
                        : "Select a product first…"}
                    </option>
                    {productId ? (
                      <optgroup label="Product and phases">
                        <option value={`proj:${productId}`}>
                          {selectedProductTitle} (whole product)
                        </option>
                        {phasesForProduct.map((ph) => (
                          <option key={ph.id} value={`proj:${ph.id}`}>
                            {ph.title}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                    {productId && tasksForProduct.length > 0 ? (
                      <optgroup label="Tasks">
                        {tasksForProduct.map((t) => (
                          <option key={t.id} value={`task:${t.id}`}>
                            {t.title}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                  </select>
                </label>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={onManualLog}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-400"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Log this hour
              </button>
            </section>
          </aside>
        </div>

        <div className="border-t border-border bg-[linear-gradient(180deg,rgba(249,250,251,0.5),rgba(255,255,255,0.96))] px-4 py-5 dark:border-zinc-800 dark:bg-[linear-gradient(180deg,rgba(9,9,11,0.4),rgba(24,24,27,0.75))] sm:px-6 lg:px-8">
          <div className="mb-3 flex items-start gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100/90 text-amber-900 ring-1 ring-amber-200/80 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-800/60">
              <Layers className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h3 className="font-serif text-base font-medium tracking-tight text-text-primary dark:text-amber-50/95">
                Journal leaves
              </h3>
              <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-text-secondary dark:text-zinc-500">
                A stack of past hours (like folded pamphlets). Newest on top. Open
                a leaf to read the full entry—saved when you log the hour to Time
                Tracking.
              </p>
            </div>
          </div>
          <div className="max-h-[min(22rem,52vh)] overflow-y-auto overflow-x-hidden pr-1">
            <JournalPergaminoLeaves entries={pamphletEntries} />
          </div>
        </div>
      </div>
    </div>
  );
}
