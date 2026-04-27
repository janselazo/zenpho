"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
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
import {
  crmDateTriggerClassName,
  CRM_SINGLE_DATE_PICKER_START_MONTH,
  crmFormatters,
  crmRdpCssVars,
  crmSingleDayClassNames,
  crmSingleDayModifiers,
} from "@/lib/crm/crm-day-picker-shared";

const HOUR_ORDER_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const TIME_COL_SCROLLER =
  "max-h-52 min-w-[3.25rem] flex-1 overflow-y-auto overscroll-y-contain rounded-xl border border-zinc-200/90 bg-zinc-50/95 py-1.5 dark:border-zinc-600/90 dark:bg-zinc-800/50 [scrollbar-width:thin] [scrollbar-color:rgba(113,113,122,0.5)_transparent]";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function formatDatetimeLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function parseDatetimeLocal(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s.trim())) return null;
  const [datePart, timePart] = s.trim().split("T");
  const [y, mo, day] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  const d = new Date(y, mo - 1, day, hh, mm, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

function from24h(h: number) {
  const isPm = h >= 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { h12, isPm };
}

function to24h(h12: number, isPm: boolean) {
  if (!isPm) {
    return h12 === 12 ? 0 : h12;
  }
  return h12 === 12 ? 12 : h12 + 12;
}

function formatCrmDateTimeDisplay(iso: string) {
  const d = parseDatetimeLocal(iso);
  if (!d) return iso;
  return d.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type TimeScrollColumnProps = {
  "aria-label": string;
  children: ReactNode;
};

function TimeScrollColumn({ "aria-label": label, children }: TimeScrollColumnProps) {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col items-stretch"
      role="group"
      aria-label={label}
    >
      <div className={TIME_COL_SCROLLER}>{children}</div>
    </div>
  );
}

type Props = {
  id: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  "aria-label"?: string;
};

export default function CrmPopoverDateTimeField({
  id,
  value,
  onChange,
  disabled = false,
  "aria-label": ariaLabel = "Date and time",
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerWrapRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{
    left: number;
    top: number;
    flipUp: boolean;
    triggerTop: number;
  } | null>(null);

  const hourBtnRef = useRef<HTMLButtonElement | null>(null);
  const minBtnRef = useRef<HTMLButtonElement | null>(null);
  const periodBtnRef = useRef<HTMLButtonElement | null>(null);

  const parsed = value.trim() ? parseDatetimeLocal(value) : null;
  const d = parsed ?? new Date();
  const { h12, isPm } = from24h(d.getHours());
  const minutes = d.getMinutes();

  const [navMonth, setNavMonth] = useState(() => d);
  useEffect(() => {
    if (!open) return;
    const p = value.trim() ? parseDatetimeLocal(value) : null;
    setNavMonth(p ?? new Date());
  }, [open, value]);

  const setFromParts = (next: Date) => {
    onChange(formatDatetimeLocalInput(next));
  };

  const updateYmd = (date: Date) => {
    const next = new Date(date);
    next.setHours(to24h(h12, isPm), minutes, 0, 0);
    setFromParts(next);
  };

  const updateClock = (nextH12: number, nextPm: boolean, nextMin: number) => {
    const next = new Date(d);
    next.setHours(to24h(nextH12, nextPm), nextMin, 0, 0);
    setFromParts(next);
  };

  const display = value.trim() ? formatCrmDateTimeDisplay(value) : null;
  const placeholder = "Select date and time";

  const updatePopoverPosition = () => {
    const el = triggerWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const estimatedHeight = 420;
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

  useLayoutEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => {
      hourBtnRef.current?.scrollIntoView({ block: "center", inline: "nearest" });
      minBtnRef.current?.scrollIntoView({ block: "center", inline: "nearest" });
      periodBtnRef.current?.scrollIntoView({ block: "center", inline: "nearest" });
    });
    return () => cancelAnimationFrame(t);
  }, [open, h12, minutes, isPm, value]);

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

  const maxW = 580;
  const popoverContent = open && popoverPos && !disabled && (
    <div
      ref={popoverRef}
      className="z-[280] w-[min(calc(100vw-1.5rem),36rem)] overflow-hidden rounded-2xl border border-border bg-white shadow-lg ring-1 ring-black/5 dark:border-zinc-600 dark:bg-zinc-900 dark:ring-white/10"
      style={{
        position: "fixed",
        left: Math.max(12, Math.min(popoverPos.left, window.innerWidth - 12 - maxW)),
        ...(popoverPos.flipUp
          ? {
              bottom: window.innerHeight - popoverPos.triggerTop + 8,
              top: "auto",
            }
          : { top: popoverPos.top, bottom: "auto" }),
      }}
      role="dialog"
      aria-label="Choose date and time"
    >
      <div className="flex max-h-[min(90vh,28rem)] flex-col sm:max-h-none sm:flex-row sm:items-stretch">
        <div className="shrink-0 border-border p-1 pt-3 sm:max-w-[min(100%,20rem)] sm:border-b-0 sm:border-r dark:border-zinc-700">
          <DayPicker
            mode="single"
            selected={parsed ?? undefined}
            showOutsideDays
            weekStartsOn={0}
            onSelect={(date) => {
              if (date) updateYmd(date);
            }}
            month={navMonth}
            onMonthChange={setNavMonth}
            captionLayout="label"
            startMonth={CRM_SINGLE_DATE_PICKER_START_MONTH}
            className="crm-rdp w-full min-w-0 text-text-primary dark:text-zinc-100"
            formatters={crmFormatters}
            classNames={crmSingleDayClassNames}
            modifiersClassNames={crmSingleDayModifiers}
            components={{
              Chevron: ({ className, size, orientation }) => {
                const dim = size ?? 20;
                if (orientation === "left") {
                  return <ChevronLeft className={className} size={dim} strokeWidth={2} aria-hidden />;
                }
                if (orientation === "right") {
                  return <ChevronRight className={className} size={dim} strokeWidth={2} aria-hidden />;
                }
                if (orientation === "up") {
                  return <ChevronUp className={className} size={dim} strokeWidth={2} aria-hidden />;
                }
                return <ChevronDown className={className} size={dim} strokeWidth={2} aria-hidden />;
              },
            }}
            style={crmRdpCssVars}
          />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col border-t border-border bg-zinc-50/40 p-3 dark:border-zinc-700 dark:bg-zinc-900/50 sm:border-l sm:border-t-0 sm:pt-4">
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary/90 dark:text-zinc-500">
            Time
          </p>
          <div className="flex min-h-0 flex-1 items-stretch justify-center gap-2 sm:gap-3">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="mb-1.5 text-center text-[0.65rem] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Hour
              </span>
              <TimeScrollColumn aria-label="Hour">
                {HOUR_ORDER_12.map((h) => {
                  const sel = h12 === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      ref={sel ? hourBtnRef : undefined}
                      onClick={() => updateClock(h, isPm, minutes)}
                      className={`mx-1 mb-0.5 w-[calc(100%-0.5rem)] rounded-lg px-2 py-1.5 text-center text-sm font-medium tabular-nums transition-colors ${
                        sel
                          ? "bg-blue-500 text-white shadow-sm dark:bg-blue-500"
                          : "text-zinc-800 hover:bg-zinc-200/80 dark:text-zinc-100 dark:hover:bg-zinc-700/80"
                      }`}
                    >
                      {pad2(h)}
                    </button>
                  );
                })}
              </TimeScrollColumn>
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <span className="mb-1.5 text-center text-[0.65rem] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Min
              </span>
              <TimeScrollColumn aria-label="Minute">
                {MINUTES.map((m) => {
                  const sel = minutes === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      ref={sel ? minBtnRef : undefined}
                      onClick={() => updateClock(h12, isPm, m)}
                      className={`mx-1 mb-0.5 w-[calc(100%-0.5rem)] rounded-lg px-2 py-1.5 text-center text-sm font-medium tabular-nums transition-colors ${
                        sel
                          ? "bg-blue-500 text-white shadow-sm dark:bg-blue-500"
                          : "text-zinc-800 hover:bg-zinc-200/80 dark:text-zinc-100 dark:hover:bg-zinc-700/80"
                      }`}
                    >
                      {pad2(m)}
                    </button>
                  );
                })}
              </TimeScrollColumn>
            </div>

            <div className="flex w-[4.5rem] shrink-0 flex-col">
              <span className="mb-1.5 text-center text-[0.65rem] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Period
              </span>
              <div className="flex max-h-52 min-h-0 flex-col justify-center gap-1.5 rounded-xl border border-zinc-200/90 bg-zinc-50/95 p-1.5 dark:border-zinc-600/90 dark:bg-zinc-800/50">
                {(
                  [
                    { key: "am" as const, label: "AM", pm: false },
                    { key: "pm" as const, label: "PM", pm: true },
                  ] as const
                ).map(({ key, label, pm }) => {
                  const sel = isPm === pm;
                  return (
                    <button
                      key={key}
                      type="button"
                      ref={sel ? periodBtnRef : undefined}
                      onClick={() => updateClock(h12, pm, minutes)}
                      className={`w-full rounded-lg py-2 text-sm font-semibold tabular-nums transition-colors ${
                        sel
                          ? "bg-blue-500 text-white shadow-sm dark:bg-blue-500"
                          : "text-zinc-800 hover:bg-zinc-200/80 dark:text-zinc-100 dark:hover:bg-zinc-700/80"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-t border-border bg-white px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-900/80">
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
          className="flex-1 rounded-xl bg-blue-500 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-600"
          onClick={() => {
            onChange(formatDatetimeLocalInput(new Date()));
            setOpen(false);
          }}
        >
          Now
        </button>
        <button
          type="button"
          className="flex-1 rounded-xl border border-border py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-surface dark:border-zinc-600 dark:hover:bg-zinc-800"
          onClick={() => setOpen(false)}
        >
          Done
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative" ref={triggerWrapRef}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={crmDateTriggerClassName}
      >
        <CalendarIcon
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/55"
          aria-hidden
        />
        <span
          className={`block w-full pl-10 pr-3 text-left text-sm font-medium tabular-nums ${
            display ? "text-text-primary" : "text-text-secondary/50"
          }`}
        >
          {display ?? placeholder}
        </span>
      </button>
      {typeof document !== "undefined" && popoverContent
        ? createPortal(popoverContent, document.body)
        : null}
    </div>
  );
}
