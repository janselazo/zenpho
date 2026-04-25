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

function playChime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(880, ctx.currentTime);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.26);
    void ctx.resume();
  } catch {
    // ignore
  }
}

function loadPersisted(): PersistedTimer | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(MONEY_JOURNAL_TIMER_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PersistedTimer;
    if (p.v !== 1) return null;
    return p;
  } catch {
    return null;
  }
}

function savePartial(p: Partial<PersistedTimer>): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const prev = loadPersisted();
    const next: PersistedTimer = {
      v: 1,
      status: p.status ?? prev?.status ?? "idle",
      firstStartMs: p.firstStartMs ?? prev?.firstStartMs ?? null,
      targetEndAt: p.targetEndAt ?? prev?.targetEndAt ?? null,
      pausedRemainingMs: p.pausedRemainingMs ?? prev?.pausedRemainingMs ?? null,
      completeLogRange: p.completeLogRange ?? prev?.completeLogRange ?? null,
      completedChime: p.completedChime ?? prev?.completedChime ?? false,
    };
    sessionStorage.setItem(MONEY_JOURNAL_TIMER_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function clearPersisted(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(MONEY_JOURNAL_TIMER_KEY);
  } catch {
    // ignore
  }
}

export type MoneyJournalTimerProps = {
  completedHoursToday: number;
  totalDots?: number;
  onCountdownComplete?: () => void;
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
    { completedHoursToday, totalDots = 5, onCountdownComplete },
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
    const completedChimeRef = useRef(false);
    const onCompleteFiredRef = useRef(false);
    const completedOnceRef = useRef(false);
    const permAsked = useRef(false);
    const onCountdownCompleteRef = useRef(onCountdownComplete);
    onCountdownCompleteRef.current = onCountdownComplete;
    const firstStartMsRef = useRef<number | null>(null);
    firstStartMsRef.current = firstStartMs;

    const markComplete = useRef<(endMs: number) => void>(() => {});

    markComplete.current = (endMs: number) => {
      if (completedOnceRef.current) return;
      completedOnceRef.current = true;
      const startMs = endMs - DURATION_MS;
      setStatus("complete");
      setCompleteLogRange({ startMs, endMs });
      setRemainingMs(0);
      targetEndAtRef.current = null;
      pausedRemainingRef.current = null;
      savePartial({
        status: "complete",
        targetEndAt: null,
        pausedRemainingMs: null,
        completeLogRange: { startMs, endMs },
        firstStartMs: firstStartMsRef.current,
      });
      if (!completedChimeRef.current) {
        completedChimeRef.current = true;
        playChime();
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
      if (!p) return;
      if (p.status === "complete" && p.completeLogRange) {
        setStatus("complete");
        setFirstStartMs(p.firstStartMs);
        setCompleteLogRange(p.completeLogRange);
        setRemainingMs(0);
        targetEndAtRef.current = null;
        pausedRemainingRef.current = null;
        completedChimeRef.current = p.completedChime;
        onCompleteFiredRef.current = p.completedChime;
        completedOnceRef.current = true;
        return;
      }
      if (p.status === "running" && p.targetEndAt) {
        setStatus("running");
        setFirstStartMs(p.firstStartMs);
        firstStartMsRef.current = p.firstStartMs;
        targetEndAtRef.current = p.targetEndAt;
        const rem = Math.max(0, p.targetEndAt - Date.now());
        setRemainingMs(rem);
      } else if (p.status === "paused" && p.pausedRemainingMs != null) {
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
      void requestNotif();
      if (status === "idle") {
        const now = Date.now();
        setFirstStartMs(now);
        firstStartMsRef.current = now;
        const end = now + DURATION_MS;
        targetEndAtRef.current = end;
        setStatus("running");
        setRemainingMs(DURATION_MS);
        onCompleteFiredRef.current = false;
        completedChimeRef.current = false;
        setCompleteLogRange(null);
        savePartial({
          status: "running",
          firstStartMs: now,
          targetEndAt: end,
          pausedRemainingMs: null,
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

    const onReset = useCallback(() => {
      targetEndAtRef.current = null;
      pausedRemainingRef.current = null;
      setStatus("idle");
      setRemainingMs(DURATION_MS);
      setFirstStartMs(null);
      firstStartMsRef.current = null;
      setCompleteLogRange(null);
      completedChimeRef.current = false;
      onCompleteFiredRef.current = false;
      completedOnceRef.current = false;
      clearPersisted();
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        getLogRange: () => {
          const now = Date.now();
          if (status === "complete" && completeLogRange) {
            const { startMs, endMs } = completeLogRange;
            return {
              startMs,
              endMs,
              startLabel: fmtTimeLabel(firstStartMs ?? startMs),
              stopLabel: fmtTimeLabel(endMs),
            };
          }
          if (status === "running" || status === "paused") {
            const rem =
              status === "running" && targetEndAtRef.current
                ? Math.max(0, targetEndAtRef.current - Date.now())
                : (pausedRemainingRef.current ?? remainingMs);
            const elapsed = DURATION_MS - rem;
            if (elapsed < 30_000) return null;
            const endMs = now;
            const startMs = endMs - elapsed;
            return {
              startMs,
              endMs,
              startLabel: fmtTimeLabel(firstStartMs ?? startMs),
              stopLabel: fmtTimeLabel(endMs),
            };
          }
          return null;
        },
        getLastCompleteLogRange: () => {
          if (!completeLogRange) return null;
          const { startMs, endMs } = completeLogRange;
          return {
            startMs,
            endMs,
            startLabel: fmtTimeLabel(firstStartMs ?? startMs),
            stopLabel: fmtTimeLabel(endMs),
          };
        },
        reset: onReset,
        getRemainingMs: () => remainingMs,
        getStatus: () => status,
      }),
      [status, completeLogRange, firstStartMs, remainingMs, onReset]
    );

    const m = Math.floor(remainingMs / 60000);
    const s = Math.floor((remainingMs % 60000) / 1000);
    const display = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

    return (
      <div className="flex flex-col items-center rounded-2xl border border-teal-500/20 bg-zinc-900/90 px-6 py-8 shadow-inner sm:px-10">
        <p className="text-sm font-medium tracking-wide text-zinc-100">Flow</p>
        <p
          className="mt-2 font-mono text-5xl font-semibold tabular-nums tracking-tight text-white sm:text-6xl"
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
                  ? "bg-emerald-400/90"
                  : "bg-zinc-600"
              }`}
            />
          ))}
        </div>
        <div className="mt-8 flex items-center justify-center gap-3">
          {status === "running" ? (
            <button
              type="button"
              onClick={onPause}
              className="inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-teal-500/50 text-teal-400/90 transition hover:border-teal-400 hover:bg-teal-500/10"
              aria-label="Pause"
            >
              <div className="h-3.5 w-3.5 rounded-sm bg-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onPlay}
              disabled={status === "complete"}
              className="inline-flex h-16 w-16 items-center justify-center rounded-full border-2 border-teal-500/50 text-teal-400/90 transition hover:border-teal-400 enabled:hover:bg-teal-500/10 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={status === "idle" ? "Start" : "Resume"}
            >
              <Play className="h-6 w-6 translate-x-0.5 fill-current" />
            </button>
          )}
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-zinc-600 text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
            aria-label="Reset timer"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          {(status === "running" || status === "paused") && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-rose-500/40 text-rose-300/80 transition hover:bg-rose-500/10"
              aria-label="Stop and clear"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          )}
        </div>
        <p className="mt-4 max-w-sm text-center text-xs text-zinc-500">
          60:00 work block. You’ll get a chime and (if allowed) a notification
          at 0:00.
        </p>
      </div>
    );
  }
);

MoneyJournalTimer.displayName = "MoneyJournalTimer";
export default MoneyJournalTimer;
