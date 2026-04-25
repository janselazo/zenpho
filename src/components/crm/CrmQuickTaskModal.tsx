"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Clock,
  ListTodo,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import {
  createLeadQuickTask,
  listLeadFollowUpAppointments,
} from "@/app/(crm)/actions/crm";
import type { LeadFollowUpAppointment } from "@/lib/crm/lead-follow-up-appointment";
import CrmPopoverDateField from "@/components/crm/CrmPopoverDateField";

function toLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalYMD(ymd: string): Date {
  const [y, mo, d] = ymd.split("-").map(Number);
  return new Date(y, mo - 1, d, 12, 0, 0, 0);
}

function addCalendarDaysFromYMD(ymd: string, days: number): string {
  const dt = parseLocalYMD(ymd);
  dt.setDate(dt.getDate() + days);
  return toLocalYMD(dt);
}

function combineLocalDateTime(ymd: string, hm: string): Date {
  const [y, mo, d] = ymd.split("-").map(Number);
  const [h, mi] = hm.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}

const QUICK_TASK_TIME_OPTIONS: { value: string; label: string }[] = (() => {
  const opts: { value: string; label: string }[] = [];
  for (let h = 8; h <= 17; h++) {
    for (const m of [0, 30]) {
      if (h === 17 && m === 30) break;
      const d = new Date(2000, 0, 1, h, m, 0, 0);
      opts.push({
        value: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        label: d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
      });
    }
  }
  return opts;
})();

type QuickPreset = "today" | "tomorrow" | "3d" | "week";

export default function CrmQuickTaskModal({
  leadId,
  contextLabel,
  resetKey,
  onClose,
}: {
  leadId: string;
  contextLabel: string;
  resetKey: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const label = contextLabel.trim() || "this contact";

  const [title, setTitle] = useState("");
  const [dateStr, setDateStr] = useState(() =>
    addCalendarDaysFromYMD(toLocalYMD(new Date()), 1)
  );
  const [timeStr, setTimeStr] = useState("09:00");
  const [quickPreset, setQuickPreset] = useState<QuickPreset | null>(
    "tomorrow"
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<LeadFollowUpAppointment[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const refreshTasks = useCallback(async () => {
    setTasksLoading(true);
    setTasksError(null);
    const res = await listLeadFollowUpAppointments(leadId);
    setTasksLoading(false);
    if ("error" in res && res.error) {
      setTasksError(res.error);
      setTasks([]);
      return;
    }
    if ("data" in res) setTasks(res.data);
  }, [leadId]);

  useEffect(() => {
    setTitle("");
    setDateStr(addCalendarDaysFromYMD(toLocalYMD(new Date()), 1));
    setTimeStr("09:00");
    setQuickPreset("tomorrow");
    setError(null);
  }, [resetKey, leadId]);

  useEffect(() => {
    void refreshTasks();
  }, [resetKey, refreshTasks]);

  const todayYmd = toLocalYMD(new Date());

  function applyPreset(p: QuickPreset) {
    setQuickPreset(p);
    if (p === "today") setDateStr(todayYmd);
    else if (p === "tomorrow")
      setDateStr(addCalendarDaysFromYMD(todayYmd, 1));
    else if (p === "3d") setDateStr(addCalendarDaysFromYMD(todayYmd, 3));
    else setDateStr(addCalendarDaysFromYMD(todayYmd, 7));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = title.trim();
    const taskTitle = trimmed || `Follow up — ${label}`;
    const start = combineLocalDateTime(dateStr, timeStr);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setPending(true);
    const res = await createLeadQuickTask({
      lead_id: leadId,
      title: taskTitle,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
    });
    setPending(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    await refreshTasks();
    router.refresh();
    onClose();
  }

  const chipBase =
    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors";
  const chipIdle =
    "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";
  const chipActive =
    "border-accent bg-accent-soft text-text-primary dark:border-accent dark:bg-accent/20 dark:text-zinc-100";

  const fieldShell =
    "flex w-full min-w-0 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-950"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        aria-modal="true"
        aria-labelledby="quick-task-title"
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="quick-task-title"
            className="text-lg font-bold text-text-primary dark:text-zinc-50"
          >
            Quick Task
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
          Create a follow-up task for{" "}
          <span className="font-semibold text-text-primary dark:text-zinc-200">
            {label}
          </span>
        </p>

        <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50/90 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary dark:text-zinc-100">
            <ListTodo className="h-4 w-4 text-zinc-500" aria-hidden />
            Follow-ups for this lead
          </div>
          {tasksLoading ? (
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Loading…
            </p>
          ) : tasksError ? (
            <p
              className="mt-3 text-xs text-red-600 dark:text-red-400"
              role="alert"
            >
              {tasksError}
            </p>
          ) : tasks.length === 0 ? (
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              No follow-ups yet. Creating a task adds it to your calendar and
              here.
            </p>
          ) : (
            <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1 text-sm">
              {tasks.map((t) => {
                const start = new Date(t.starts_at);
                const when = Number.isNaN(start.getTime())
                  ? "—"
                  : start.toLocaleString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    });
                return (
                  <li
                    key={t.id}
                    className="rounded-lg border border-zinc-200/80 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
                  >
                    <p className="font-medium text-text-primary dark:text-zinc-100">
                      {t.title}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {when}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-700 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={(e) => void onSubmit(e)} className="mt-5 space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Follow up on proposal or scope call"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-text-primary outline-none transition-[box-shadow,border-color] placeholder:text-zinc-400 focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["today", "Today"],
                ["tomorrow", "Tomorrow"],
                ["3d", "In 3 days"],
                ["week", "Next week"],
              ] as const
            ).map(([key, lbl]) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                className={`${chipBase} ${
                  quickPreset === key ? chipActive : chipIdle
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <CrmPopoverDateField
              id="quick-task-date"
              value={dateStr}
              onChange={(v) => {
                setDateStr(v);
                setQuickPreset(null);
              }}
              triggerClassName="w-full"
              showFooter
            />
            <div className={fieldShell}>
              <Clock className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
              <div className="relative min-w-0 flex-1">
                <ChevronDown
                  className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                  aria-hidden
                />
                <select
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                  className="w-full appearance-none border-0 bg-transparent py-0.5 pr-6 text-sm font-medium text-text-primary outline-none dark:text-zinc-100"
                >
                  {QUICK_TASK_TIME_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover disabled:opacity-60"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Plus className="h-4 w-4" aria-hidden />
              )}
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
