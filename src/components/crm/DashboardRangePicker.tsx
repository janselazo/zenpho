"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { DayPicker, type DateRange } from "react-day-picker";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import "react-day-picker/style.css";
import {
  DASHBOARD_ALL_TIME_FROM,
  defaultDashboardRange,
  formatDashboardRangeLabel,
} from "@/lib/crm/dashboard-range";

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

type QuickId =
  | "today"
  | "7d"
  | "30d"
  | "month"
  | "3mo"
  | "year"
  | "all";

const QUICK: { id: QuickId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "month", label: "This month" },
  { id: "3mo", label: "Last 3 months" },
  { id: "year", label: "This year" },
  { id: "all", label: "All time" },
];

function computeQuick(
  id: QuickId
): { from: string; to: string; all?: true } | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const to = toYmd(today);

  switch (id) {
    case "today":
      return { from: to, to };
    case "7d": {
      const s = new Date(today);
      s.setDate(s.getDate() - 6);
      return { from: toYmd(s), to };
    }
    case "30d": {
      const s = new Date(today);
      s.setDate(s.getDate() - 29);
      return { from: toYmd(s), to };
    }
    case "month": {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: toYmd(s), to };
    }
    case "3mo": {
      const s = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      return { from: toYmd(s), to };
    }
    case "year": {
      const s = new Date(today.getFullYear(), 0, 1);
      return { from: toYmd(s), to };
    }
    case "all":
      return { from: DASHBOARD_ALL_TIME_FROM, to, all: true };
    default:
      return null;
  }
}

function quickIsActive(
  id: QuickId,
  from: string,
  to: string,
  isAllTime: boolean
): boolean {
  if (id === "all") return isAllTime;
  if (isAllTime) return false;
  const c = computeQuick(id);
  if (!c || c.all) return false;
  return c.from === from && c.to === to;
}

export default function DashboardRangePicker({
  from: fromProp,
  to: toProp,
  isAllTime,
}: {
  from: string;
  to: string;
  isAllTime: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const triggerWrapRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{
    left: number;
    top: number;
    flipUp: boolean;
    triggerTop: number;
  } | null>(null);
  const [draft, setDraft] = useState<DateRange | undefined>(() => ({
    from: parseYmd(fromProp),
    to: parseYmd(toProp),
  }));

  const triggerLabel = isAllTime
    ? "All time"
    : formatDashboardRangeLabel(fromProp, toProp);

  useLayoutEffect(() => {
    if (!open) {
      setPopoverPos(null);
      return;
    }
    setDraft({
      from: parseYmd(fromProp),
      to: parseYmd(toProp),
    });
  }, [open, fromProp, toProp]);

  const updatePopoverPosition = () => {
    const el = triggerWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const estimatedHeight = 440;
    const gap = 8;
    const popoverWidth = Math.min(720, window.innerWidth - 24);
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const flipUp = spaceBelow < estimatedHeight && rect.top > spaceBelow;
    const left = Math.max(12, rect.right - popoverWidth);
    setPopoverPos({
      left,
      flipUp,
      triggerTop: rect.top,
      top: rect.bottom + gap,
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPopoverPos(null);
      return;
    }
    updatePopoverPosition();
    window.addEventListener("scroll", updatePopoverPosition, true);
    window.addEventListener("resize", updatePopoverPosition);
    return () => {
      window.removeEventListener("scroll", updatePopoverPosition, true);
      window.removeEventListener("resize", updatePopoverPosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerWrapRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function navigateRange(nextFrom: string, nextTo: string, all?: boolean) {
    if (all) {
      router.push("/dashboard?range=all");
    } else {
      router.push(`/dashboard?from=${nextFrom}&to=${nextTo}`);
    }
    setOpen(false);
  }

  function applyDraft() {
    const f = draft?.from;
    const t = draft?.to ?? draft?.from;
    if (!f || !t) return;
    let a = toYmd(f);
    let b = toYmd(t);
    if (a > b) {
      const x = a;
      a = b;
      b = x;
    }
    navigateRange(a, b, false);
  }

  function onQuick(id: QuickId) {
    const r = computeQuick(id);
    if (!r) return;
    if (r.all) {
      navigateRange("", "", true);
      return;
    }
    navigateRange(r.from, r.to, false);
  }

  function onClear() {
    const d = defaultDashboardRange();
    setDraft({
      from: parseYmd(d.from),
      to: parseYmd(d.to),
    });
    navigateRange(d.from, d.to, false);
  }

  const popoverWidth = Math.min(720, typeof window !== "undefined" ? window.innerWidth - 24 : 720);

  const popoverContent = open && popoverPos && (
    <div
      ref={popoverRef}
      className="z-[300] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_20px_50px_-12px_rgba(0,0,0,0.22)] dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]"
      style={{
        position: "fixed",
        width: popoverWidth,
        left: popoverPos.left,
        ...(popoverPos.flipUp
          ? {
              bottom: window.innerHeight - popoverPos.triggerTop + 8,
              top: "auto",
            }
          : { top: popoverPos.top, bottom: "auto" }),
      }}
      role="dialog"
      aria-label="Choose date range"
    >
      <div className="flex max-h-[min(85vh,520px)] flex-col sm:max-h-[none] sm:flex-row">
        <div className="shrink-0 border-b border-zinc-200 p-3 dark:border-zinc-700 sm:w-44 sm:border-b-0 sm:border-r">
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-text-secondary/60 dark:text-zinc-500">
            Quick select
          </p>
          <nav className="flex flex-row flex-wrap gap-1 sm:flex-col sm:flex-nowrap">
            {QUICK.map((q) => {
              const active = quickIsActive(q.id, fromProp, toProp, isAllTime);
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onQuick(q.id)}
                  className={`rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors sm:w-full ${
                    active
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                      : "text-text-primary hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  }`}
                >
                  {q.label}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="min-w-0 flex-1 overflow-x-auto overflow-y-auto p-3">
          <DayPicker
            mode="range"
            selected={draft}
            onSelect={setDraft}
            numberOfMonths={2}
            showOutsideDays
            weekStartsOn={0}
            pagedNavigation
            defaultMonth={draft?.from ?? draft?.to ?? new Date()}
            captionLayout="label"
            startMonth={new Date(2018, 0)}
            endMonth={new Date(2035, 11)}
            className="crm-rdp mx-auto w-max max-w-full text-text-primary dark:text-zinc-100"
            components={{
              Chevron: ({ className, size, orientation }) => {
                const dim = size ?? 20;
                if (orientation === "left") {
                  return (
                    <ChevronLeft
                      className={className}
                      size={dim}
                      strokeWidth={2}
                      aria-hidden
                    />
                  );
                }
                if (orientation === "right") {
                  return (
                    <ChevronRight
                      className={className}
                      size={dim}
                      strokeWidth={2}
                      aria-hidden
                    />
                  );
                }
                if (orientation === "up") {
                  return (
                    <ChevronUp
                      className={className}
                      size={dim}
                      strokeWidth={2}
                      aria-hidden
                    />
                  );
                }
                return (
                  <ChevronDown
                    className={className}
                    size={dim}
                    strokeWidth={2}
                    aria-hidden
                  />
                );
              },
            }}
            classNames={{
              months: "flex flex-col gap-4 sm:flex-row sm:gap-6",
              month: "space-y-2",
              button_previous:
                "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
              button_next:
                "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
              day_button:
                "m-0 rounded-lg border-2 border-transparent text-sm font-medium outline-none transition-colors hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:hover:bg-zinc-800",
            }}
            modifiersClassNames={{
              today:
                "[&_button]:font-semibold [&_button]:text-blue-700 [&_button]:ring-1 [&_button]:ring-inset [&_button]:ring-blue-200/90 dark:[&_button]:text-blue-300 dark:[&_button]:ring-blue-800/70",
              range_start:
                "[&_button]:!bg-blue-600 [&_button]:!text-white [&_button]:hover:!bg-blue-600 [&_button]:!font-semibold",
              range_end:
                "[&_button]:!bg-blue-600 [&_button]:!text-white [&_button]:hover:!bg-blue-600 [&_button]:!font-semibold",
              range_middle:
                "[&_button]:!bg-blue-100 [&_button]:!text-blue-900 dark:[&_button]:!bg-blue-950/50 dark:[&_button]:!text-blue-100",
              outside: "text-zinc-400 opacity-55 dark:text-zinc-500",
            }}
            style={
              {
                "--rdp-accent-color": "#2563eb",
                "--rdp-accent-background-color": "rgba(37, 99, 235, 0.14)",
                "--rdp-day_button-height": "2.35rem",
                "--rdp-day_button-width": "2.35rem",
                "--rdp-nav-height": "2.5rem",
                "--rdp-selected-border": "2px solid transparent",
                "--rdp-day_button-border": "2px solid transparent",
              } as CSSProperties
            }
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3 dark:border-zinc-700">
        <button
          type="button"
          className="text-sm font-semibold text-text-primary hover:underline dark:text-zinc-200"
          onClick={onClear}
        >
          Clear
        </button>
        <button
          type="button"
          className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
          onClick={applyDraft}
        >
          Apply
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative shrink-0" ref={triggerWrapRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-text-primary shadow-sm transition-colors hover:bg-surface dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-800/80"
      >
        <Calendar className="h-4 w-4 shrink-0 text-text-secondary/70 dark:text-zinc-400" aria-hidden />
        <span className="max-w-[14rem] truncate tabular-nums">{triggerLabel}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-secondary/60 transition-transform dark:text-zinc-500 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {typeof document !== "undefined" && popoverContent
        ? createPortal(popoverContent, document.body)
        : null}
    </div>
  );
}
