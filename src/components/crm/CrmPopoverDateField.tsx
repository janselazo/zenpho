"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import "react-day-picker/style.css";

function parseIso(iso: string): Date | undefined {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Props = {
  id: string;
  value: string;
  onChange: (iso: string) => void;
  /** Full trigger button classes (include `relative`, height, border, etc.) */
  triggerClassName: string;
  /** Trigger label: Mar 25, 2026 vs 03/25/2026 */
  displayFormat?: "medium" | "numeric";
};

export default function CrmPopoverDateField({
  id,
  value,
  onChange,
  triggerClassName,
  displayFormat = "medium",
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerWrapRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{
    left: number;
    top: number;
    flipUp: boolean;
    /** Trigger top edge (viewport); used when flipUp to set `bottom`. */
    triggerTop: number;
  } | null>(null);
  const selected = parseIso(value);
  const display = selected
    ? displayFormat === "numeric"
      ? new Intl.DateTimeFormat("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
        }).format(selected)
      : new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }).format(selected)
    : null;
  const placeholder =
    displayFormat === "numeric" ? "mm/dd/yyyy" : "mm / dd / yyyy";

  const updatePopoverPosition = () => {
    const el = triggerWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const estimatedHeight = 340;
    const gap = 8;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const flipUp = spaceBelow < estimatedHeight && rect.top > spaceBelow;
    setPopoverPos({
      left: rect.left,
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

  const popoverContent = open && popoverPos && (
    <div
      ref={popoverRef}
      className="z-[280] w-[min(calc(100vw-1.5rem),21rem)] overflow-hidden rounded-2xl border border-border bg-white shadow-lg ring-1 ring-black/5 dark:border-zinc-600 dark:bg-zinc-900 dark:ring-white/10"
      style={{
        position: "fixed",
        left: Math.max(12, Math.min(popoverPos.left, window.innerWidth - 12 - 328)),
        ...(popoverPos.flipUp
          ? {
              bottom: window.innerHeight - popoverPos.triggerTop + 8,
              top: "auto",
            }
          : { top: popoverPos.top, bottom: "auto" }),
      }}
      role="dialog"
      aria-label="Choose date"
    >
      <div className="p-1 pt-3">
        <DayPicker
          mode="single"
          selected={selected}
          showOutsideDays
          weekStartsOn={0}
          onSelect={(d) => {
            if (d) {
              onChange(toIso(d));
              setOpen(false);
            }
          }}
          defaultMonth={selected ?? new Date()}
          captionLayout="label"
          startMonth={new Date(2000, 0)}
          endMonth={new Date(2040, 11)}
          className="crm-rdp w-full min-w-0 text-text-primary dark:text-zinc-100"
          classNames={{
            months: "relative w-full",
            month: "relative w-full space-y-0 px-2 pb-1",
            month_caption: "relative z-[1] mb-2 flex h-9 items-center justify-center px-10",
            caption_label: "text-sm font-semibold tabular-nums text-text-primary dark:text-zinc-100",
            nav: "absolute inset-x-2 top-3 flex items-center justify-between",
            button_previous:
              "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
            button_next:
              "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
            weekdays: "mb-1 flex w-full border-b border-zinc-100 px-0.5 pb-2 dark:border-zinc-700/80",
            weekday:
              "h-7 w-9 p-0 text-center text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-text-secondary/80 dark:text-zinc-500",
            week: "mt-0 flex w-full",
            day: "p-0 text-center",
            day_button:
              "m-0 rounded-lg border-2 border-transparent text-sm font-medium outline-none transition-colors hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-0 dark:hover:bg-zinc-800",
          }}
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
          modifiersClassNames={{
            today:
              "[&_button]:rounded-lg [&_button]:font-semibold [&_button]:text-[var(--color-accent)] [&_button]:ring-1 [&_button]:ring-inset [&_button]:ring-[var(--color-accent)]/25 dark:[&_button]:text-blue-300 dark:[&_button]:ring-blue-800/70",
            selected:
              "[&_button]:!border-transparent [&_button]:!bg-[var(--color-accent)] [&_button]:!text-white [&_button]:hover:!bg-[var(--color-accent-hover)] [&_button]:focus:!bg-[var(--color-accent)] [&_button]:!font-semibold [&_button]:!shadow-sm [&_button]:!ring-0 [&_button]:focus-visible:!ring-2 [&_button]:focus-visible:!ring-white/50",
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
      <div className="flex gap-2 border-t border-border bg-surface/60 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800/50">
        <button
          type="button"
          className="flex-1 rounded-xl border border-border bg-white py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text-primary dark:border-zinc-600 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          onClick={() => {
            onChange("");
            setOpen(false);
          }}
        >
          Clear
        </button>
        <button
          type="button"
          className="flex-1 rounded-xl bg-[var(--color-accent)] py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-accent-hover)]"
          onClick={() => {
            onChange(toIso(new Date()));
            setOpen(false);
          }}
        >
          Today
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative" ref={triggerWrapRef}>
      <button
        type="button"
        id={id}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName}
      >
        <CalendarIcon
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/55"
          aria-hidden
        />
        <span
          className={`block w-full pl-10 pr-10 text-left text-sm tabular-nums ${
            display ? "text-text-primary" : "text-text-secondary/50"
          }`}
        >
          {display ?? placeholder}
        </span>
        <ChevronDown
          className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/55 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {typeof document !== "undefined" && popoverContent
        ? createPortal(popoverContent, document.body)
        : null}
    </div>
  );
}
