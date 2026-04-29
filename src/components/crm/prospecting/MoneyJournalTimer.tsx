"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
} from "react";
import { Play, RotateCcw, Square } from "lucide-react";
import { MONEY_JOURNAL_TIMER_KEY } from "@/lib/crm/money-journal-types";
import { signalMoneyJournalHourComplete } from "@/lib/crm/money-journal-hour-complete-notify";
import {
  unlockMoneyJournalTimerAudio,
  playMoneyJournalTimerChime,
} from "@/lib/crm/money-journal-timer-chime";
import {
  clearMoneyJournalTimerStorage,
  readMoneyJournalTimerRaw,
  writeMoneyJournalTimerRaw,
} from "@/lib/crm/money-journal-timer-storage";

const DURATION_MS = 60 * 60 * 1000;
const TICK_MS = 250;

type TimerStatus = "idle" | "running" | "paused" | "complete";

export type MoneyJournalLogRange = {
  startMs: number;
  endMs: number;
  startLabel: string;
  stopLabel: string;
};

type PersistedTimer = {
  v: 1;
  status: TimerStatus;
  firstStartMs: number | null;
  targetEndAt: number | null;
  pausedRemainingMs: number | null;
  /** Set when the user ends the block early (Stop); pauses the countdown and fixes the log window. */
  userSessionStopAtMs: number | null;
  completeLogRange: { startMs: number; endMs: number } | null;
  completedChime: boolean;
};

function fmtTimeLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function loadPersisted(): PersistedTimer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = readMoneyJournalTimerRaw();
    if (!raw) return null;
    const p = JSON.parse(raw) as PersistedTimer;
    if (p.v !== 1) return null;
    if (p.userSessionStopAtMs === undefined) p.userSessionStopAtMs = null;
    return p;
  } catch {
    return null;
  }
}

function savePartial(p: Partial<PersistedTimer>): void {
  try {
    const prev = loadPersisted();
    const next: PersistedTimer = {
      v: 1,
      status: p.status ?? prev?.status ?? "idle",
      firstStartMs: p.firstStartMs ?? prev?.firstStartMs ?? null,
      targetEndAt: p.targetEndAt ?? prev?.targetEndAt ?? null,
      pausedRemainingMs: p.pausedRemainingMs ?? prev?.pausedRemainingMs ?? null,
      userSessionStopAtMs: p.userSessionStopAtMs ?? prev?.userSessionStopAtMs ?? null,
      completeLogRange: p.completeLogRange ?? prev?.completeLogRange ?? null,
      completedChime: p.completedChime ?? prev?.completedChime ?? false,
    };
    writeMoneyJournalTimerRaw(JSON.stringify(next));
  } catch {
    // ignore
  }
}

function clearPersisted(): void {
  clearMoneyJournalTimerStorage();
}

export type MoneyJournalTimerProps = {
  completedHoursToday: number;
  totalDots?: number;
  onCountdownComplete?: () => void;
  /** First Start press in a block. */
  onSessionStart?: (startedAtMs: number) => void;
  /** Stop button, full hour at 0:00, or when logging—wall-clock end of the session. */
  onSessionStop?: (stoppedAtMs: number) => void;
  /** Full reset (rotate) — clear saved session event times in the parent. */
  onSessionReset?: () => void;
};

export type MoneyJournalTimerHandle = {
  getLogRange: () => MoneyJournalLogRange | null;
  getLastCompleteLogRange: () => MoneyJournalLogRange | null;
  reset: () => void;
  getRemainingMs: () => number;
  getStatus: () => TimerStatus;
};

const MoneyJournalTimer = forwardRef<MoneyJournalTimerHandle, MoneyJournalTimerProps>(
  function MoneyJournalTimer(
    {
      completedHoursToday,
      totalDots = 5,
      onCountdownComplete,
      onSessionStart,
      onSessionStop,
      onSessionReset,
    },
    ref
  ) {
    const [status, setStatus] = useState<TimerStatus>("idle");
    const [remainingMs, setRemainingMs] = useState(DURATION_MS);
    const [firstStartMs, setFirstStartMs] = useState<number | null>(null);
    const targetEndAtRef = useRef<number | null>(null);
    const pausedRemainingRef = useRef<number | null>(null);
    const [completeLogRange, setCompleteLogRange] = useState<{
      startMs: number;
      endMs: number;
    } | null>(null);
    const [userSessionStopAtMs, setUserSessionStopAtMs] = useState<number | null>(null);
    const userSessionStopAtRef = useRef<number | null>(null);
    const completedChimeRef = useRef(false);
    const completeStopNotifiedRef = useRef(false);

    useEffect(() => {
      userSessionStopAtRef.current = userSessionStopAtMs;
    }, [userSessionStopAtMs]);
    const onCompleteFiredRef = useRef(false);
    const completedOnceRef = useRef(false);
    const permAsked = useRef(false);
    const onCountdownCompleteRef = useRef(onCountdownComplete);
    onCountdownCompleteRef.current = onCountdownComplete;
    const onSessionStartRef = useRef(onSessionStart);
    onSessionStartRef.current = onSessionStart;
    const onSessionStopRef = useRef(onSessionStop);
    onSessionStopRef.current = onSessionStop;
    const onSessionResetRef = useRef(onSessionReset);
    onSessionResetRef.current = onSessionReset;
    const firstStartMsRef = useRef<number | null>(null);
    firstStartMsRef.current = firstStartMs;

    const markComplete = useRef<(endMs: number) => void>(() => {});

    markComplete.current = (endMs: number) => {
      if (completedOnceRef.current) return;
      const already = loadPersisted();
      if (already?.status === "complete" && already.completeLogRange) {
        // Another tab (or a race) already wrote completion; sync UI, skip chime/callbacks.
        completedOnceRef.current = true;
        setStatus("complete");
        setFirstStartMs(already.firstStartMs);
        setCompleteLogRange(already.completeLogRange);
        setRemainingMs(0);
        firstStartMsRef.current = already.firstStartMs;
        targetEndAtRef.current = null;
        pausedRemainingRef.current = null;
        setUserSessionStopAtMs(null);
        userSessionStopAtRef.current = null;
        completedChimeRef.current = already.completedChime;
        onCompleteFiredRef.current = already.completedChime;
        completeStopNotifiedRef.current = true;
        return;
      }
      completedOnceRef.current = true;
      const startMs = endMs - DURATION_MS;
      setStatus("complete");
      setCompleteLogRange({ startMs, endMs });
      setRemainingMs(0);
      targetEndAtRef.current = null;
      pausedRemainingRef.current = null;
      if (!completeStopNotifiedRef.current) {
        completeStopNotifiedRef.current = true;
        onSessionStopRef.current?.(endMs);
      }
      savePartial({
        status: "complete",
        targetEndAt: null,
        pausedRemainingMs: null,
        userSessionStopAtMs: null,
        completeLogRange: { startMs, endMs },
        firstStartMs: firstStartMsRef.current,
      });
      if (!completedChimeRef.current) {
        completedChimeRef.current = true;
        playMoneyJournalTimerChime();
        signalMoneyJournalHourComplete();
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            new Notification("Hour complete", {
              body: "Fill in or confirm your journal entry for this block.",
            });
          } catch {
            // ignore
          }
        }
        savePartial({ completedChime: true });
        if (onCountdownCompleteRef.current && !onCompleteFiredRef.current) {
          onCompleteFiredRef.current = true;
          onCountdownCompleteRef.current();
        }
      }
    };

    const hydrate = useCallback(() => {
      const p = loadPersisted();
      if (!p) {
        targetEndAtRef.current = null;
        pausedRemainingRef.current = null;
        setUserSessionStopAtMs(null);
        userSessionStopAtRef.current = null;
        setStatus("idle");
        setRemainingMs(DURATION_MS);
        setFirstStartMs(null);
        firstStartMsRef.current = null;
        setCompleteLogRange(null);
        completedChimeRef.current = false;
        onCompleteFiredRef.current = false;
        completedOnceRef.current = false;
        completeStopNotifiedRef.current = false;
        return;
      }
      if (p.status === "complete" && p.completeLogRange) {
        setStatus("complete");
        setFirstStartMs(p.firstStartMs);
        setCompleteLogRange(p.completeLogRange);
        setRemainingMs(0);
        targetEndAtRef.current = null;
        pausedRemainingRef.current = null;
        setUserSessionStopAtMs(null);
        userSessionStopAtRef.current = null;
        completedChimeRef.current = p.completedChime;
        onCompleteFiredRef.current = p.completedChime;
        completeStopNotifiedRef.current = p.completedChime;
        completedOnceRef.current = true;
        return;
      }
      if (p.userSessionStopAtMs != null && p.status === "paused") {
        setUserSessionStopAtMs(p.userSessionStopAtMs);
        userSessionStopAtRef.current = p.userSessionStopAtMs;
        setStatus("paused");
        setFirstStartMs(p.firstStartMs);
        firstStartMsRef.current = p.firstStartMs;
        targetEndAtRef.current = null;
        pausedRemainingRef.current = p.pausedRemainingMs;
        setRemainingMs(p.pausedRemainingMs ?? 0);
        return;
      }
      if (p.status === "running" && p.targetEndAt) {
        setUserSessionStopAtMs(null);
        userSessionStopAtRef.current = null;
        setStatus("running");
        setFirstStartMs(p.firstStartMs);
        firstStartMsRef.current = p.firstStartMs;
        targetEndAtRef.current = p.targetEndAt;
        const rem = Math.max(0, p.targetEndAt - Date.now());
        setRemainingMs(rem);
      } else if (p.status === "paused" && p.pausedRemainingMs != null) {
        setUserSessionStopAtMs(null);
        userSessionStopAtRef.current = null;
        setStatus("paused");
        setFirstStartMs(p.firstStartMs);
        firstStartMsRef.current = p.firstStartMs;
        pausedRemainingRef.current = p.pausedRemainingMs;
        setRemainingMs(p.pausedRemainingMs);
      }
    }, []);

    useEffect(() => {
      hydrate();
    }, [hydrate]);

    useEffect(() => {
      const onStorage = (e: StorageEvent) => {
        if (e.key !== MONEY_JOURNAL_TIMER_KEY) return;
        if (e.storageArea && e.storageArea !== window.localStorage) return;
        hydrate();
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }, [hydrate]);

    useEffect(() => {
      if (status !== "running" || !targetEndAtRef.current) return;
      const id = window.setInterval(() => {
        const t = targetEndAtRef.current;
        if (!t) return;
        const rem = Math.max(0, t - Date.now());
        setRemainingMs(rem);
        savePartial({ status: "running", targetEndAt: t, pausedRemainingMs: null });
        if (rem <= 0) {
          window.clearInterval(id);
          const end = t;
          markComplete.current(end);
        }
      }, TICK_MS);
      return () => window.clearInterval(id);
    }, [status]);

    const requestNotif = useCallback(async () => {
      if (typeof Notification === "undefined" || permAsked.current) return;
      permAsked.current = true;
      try {
        await Notification.requestPermission();
      } catch {
        // ignore
      }
    }, []);

    const onPlay = useCallback(() => {
      unlockMoneyJournalTimerAudio();
      void requestNotif();
      if (userSessionStopAtRef.current != null) return;
      if (status === "idle") {
        const now = Date.now();
        setUserSessionStopAtMs(null);
        setFirstStartMs(now);
        firstStartMsRef.current = now;
        const end = now + DURATION_MS;
        targetEndAtRef.current = end;
        setStatus("running");
        setRemainingMs(DURATION_MS);
        onCompleteFiredRef.current = false;
        completedChimeRef.current = false;
        completeStopNotifiedRef.current = false;
        setCompleteLogRange(null);
        onSessionStartRef.current?.(now);
        savePartial({
          status: "running",
          firstStartMs: now,
          targetEndAt: end,
          pausedRemainingMs: null,
          userSessionStopAtMs: null,
          completeLogRange: null,
          completedChime: false,
        });
        return;
      }
      if (status === "paused") {
        const rem = pausedRemainingRef.current ?? DURATION_MS;
        const end = Date.now() + rem;
        targetEndAtRef.current = end;
        setStatus("running");
        pausedRemainingRef.current = null;
        savePartial({
          status: "running",
          targetEndAt: end,
          pausedRemainingMs: null,
          firstStartMs: firstStartMsRef.current,
        });
      }
    }, [status, requestNotif]);

    const onPause = useCallback(() => {
      if (status !== "running" || !targetEndAtRef.current) return;
      const rem = Math.max(0, targetEndAtRef.current - Date.now());
      targetEndAtRef.current = null;
      pausedRemainingRef.current = rem;
      setStatus("paused");
      setRemainingMs(rem);
      savePartial({
        status: "paused",
        targetEndAt: null,
        pausedRemainingMs: rem,
        firstStartMs: firstStartMsRef.current,
      });
    }, [status]);

    const onUserSessionStop = useCallback(() => {
      if (userSessionStopAtRef.current != null) return;
      if (status === "complete") return;
      if (status !== "running" && status !== "paused") return;
      const now = Date.now();
      if (status === "running" && targetEndAtRef.current) {
        const rem = Math.max(0, targetEndAtRef.current - now);
        targetEndAtRef.current = null;
        pausedRemainingRef.current = rem;
        setRemainingMs(rem);
      } else if (status === "paused") {
        const rem = pausedRemainingRef.current ?? remainingMs;
        pausedRemainingRef.current = rem;
        setRemainingMs(rem);
      }
      setUserSessionStopAtMs(now);
      userSessionStopAtRef.current = now;
      setStatus("paused");
      savePartial({
        status: "paused",
        targetEndAt: null,
        pausedRemainingMs: pausedRemainingRef.current,
        firstStartMs: firstStartMsRef.current,
        userSessionStopAtMs: now,
      });
      onSessionStopRef.current?.(now);
    }, [status, remainingMs]);

    const onReset = useCallback(() => {
      targetEndAtRef.current = null;
      pausedRemainingRef.current = null;
      setUserSessionStopAtMs(null);
      userSessionStopAtRef.current = null;
      setStatus("idle");
      setRemainingMs(DURATION_MS);
      setFirstStartMs(null);
      firstStartMsRef.current = null;
      setCompleteLogRange(null);
      completedChimeRef.current = false;
      onCompleteFiredRef.current = false;
      completedOnceRef.current = false;
      completeStopNotifiedRef.current = false;
      clearPersisted();
      onSessionResetRef.current?.();
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        getLogRange: () => {
          const now = Date.now();
          const first = firstStartMsRef.current;
          const userStop = userSessionStopAtRef.current;
          if (status === "complete" && completeLogRange) {
            const { startMs, endMs } = completeLogRange;
            const sm = first ?? startMs;
            return {
              startMs: sm,
              endMs,
              startLabel: fmtTimeLabel(sm),
              stopLabel: fmtTimeLabel(endMs),
            };
          }
          if (userStop != null && first != null) {
            if (userStop - first < 30_000) return null;
            return {
              startMs: first,
              endMs: userStop,
              startLabel: fmtTimeLabel(first),
              stopLabel: fmtTimeLabel(userStop),
            };
          }
          if (status === "running" || status === "paused") {
            if (first == null) return null;
            const elapsed = now - first;
            if (elapsed < 30_000) return null;
            return {
              startMs: first,
              endMs: now,
              startLabel: fmtTimeLabel(first),
              stopLabel: fmtTimeLabel(now),
            };
          }
          return null;
        },
        getLastCompleteLogRange: () => {
          if (!completeLogRange) return null;
          const { startMs, endMs } = completeLogRange;
          const sm = firstStartMsRef.current ?? startMs;
          return {
            startMs: sm,
            endMs,
            startLabel: fmtTimeLabel(sm),
            stopLabel: fmtTimeLabel(endMs),
          };
        },
        reset: onReset,
        getRemainingMs: () => remainingMs,
        getStatus: () => status,
      }),
      [status, completeLogRange, remainingMs, onReset]
    );

    const m = Math.floor(remainingMs / 60000);
    const s = Math.floor((remainingMs % 60000) / 1000);
    const display = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

    return (
      <div className="relative overflow-hidden rounded-3xl border border-border bg-white px-6 py-7 text-center shadow-sm ring-1 ring-black/[0.03] dark:border-zinc-800 dark:bg-zinc-950/75 dark:ring-white/[0.04]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.14),transparent_45%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(45,212,191,0.14),transparent_45%)]" />
        <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-text-secondary/80 dark:text-zinc-500">
          Timer
        </p>
        <p
          className="mt-3 font-mono text-5xl font-semibold tabular-nums tracking-tight text-text-primary dark:text-zinc-50 sm:text-6xl"
          aria-live="polite"
        >
          {display}
        </p>
        <div
          className="mt-4 flex justify-center gap-1.5"
          role="img"
          aria-label={`${Math.min(completedHoursToday, totalDots)} of ${totalDots} hours completed today`}
        >
          {Array.from({ length: totalDots }).map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${
                i < Math.min(completedHoursToday, totalDots)
                  ? "bg-accent dark:bg-emerald-400/90"
                  : "bg-zinc-200 dark:bg-zinc-700"
              }`}
            />
          ))}
        </div>
        <div className="mt-7 flex items-center justify-center gap-3">
          {status === "running" ? (
            <button
              type="button"
              onClick={onPause}
              className="inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-accent/35 bg-accent/10 text-accent transition hover:border-accent/60 hover:bg-accent/15 dark:border-teal-400/45 dark:bg-teal-400/10 dark:text-teal-300"
              aria-label="Pause timer"
            >
              <div className="h-3.5 w-3.5 rounded-sm bg-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onPlay}
              disabled={status === "complete" || userSessionStopAtMs != null}
              className="inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-accent/35 bg-accent/10 text-accent transition hover:border-accent/60 enabled:hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-40 dark:border-teal-400/45 dark:bg-teal-400/10 dark:text-teal-300"
              aria-label={status === "idle" ? "Start timer" : "Resume timer"}
            >
              <Play className="h-5 w-5 translate-x-0.5 fill-current" />
            </button>
          )}
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-zinc-50 text-text-secondary transition hover:bg-surface hover:text-text-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Reset timer"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          {(status === "running" || (status === "paused" && userSessionStopAtMs == null)) && (
            <button
              type="button"
              onClick={onUserSessionStop}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100 dark:border-rose-400/30 dark:bg-rose-400/5 dark:text-rose-300/80 dark:hover:bg-rose-400/10"
              aria-label="Stop timer"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          )}
        </div>
        {userSessionStopAtMs != null ? (
          <p className="mx-auto mt-3 max-w-xs text-xs font-medium text-amber-800/90 dark:text-amber-200/80">
            Timer stopped. Log this hour below, or reset to start a new block.
          </p>
        ) : null}
        </div>
      </div>
    );
  }
);

MoneyJournalTimer.displayName = "MoneyJournalTimer";
export default MoneyJournalTimer;
