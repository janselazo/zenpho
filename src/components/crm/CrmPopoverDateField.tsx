"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
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
import {
  crmDatePlaceholder,
  crmDateTriggerClassName,
  crmFormatters,
  crmRdpCssVars,
  crmSingleDayClassNames,
  crmSingleDayModifiers,
  formatCrmDateTrigger,
} from "@/lib/crm/crm-day-picker-shared";

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
  /** Merged with the shared CRM date field shell (borders, icon inset). */
  triggerClassName?: string;
  displayFormat?: "presentation" | "medium" | "numeric";
  showFooter?: boolean;
  showTriggerChevron?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
};

export default function CrmPopoverDateField({
  id,
  value,
  onChange,
  triggerClassName,
  displayFormat = "presentation",
  showFooter = false,
  showTriggerChevron = false,
  disabled = false,
  "aria-label": ariaLabel,
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
  const selected = parseIso(value);
  const display = value?.trim()
    ? formatCrmDateTrigger(value, displayFormat)
    : null;
  const placeholder = crmDatePlaceholder(displayFormat);
  const triggerClasses = [crmDateTriggerClassName, triggerClassName]
    .filter(Boolean)
    .join(" ");

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

  const popoverContent = open && popoverPos && !disabled && (
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
          formatters={crmFormatters}
          classNames={crmSingleDayClassNames}
          modifiersClassNames={crmSingleDayModifiers}
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
          style={crmRdpCssVars}
        />
      </div>
      {showFooter ? (
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
            className="flex-1 rounded-xl bg-blue-500 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-600"
            onClick={() => {
              onChange(toIso(new Date()));
              setOpen(false);
            }}
          >
            Today
          </button>
        </div>
      ) : null}
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
        className={triggerClasses}
      >
        <CalendarIcon
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/55"
          aria-hidden
        />
        <span
          className={`block w-full text-left text-sm tabular-nums ${
            showTriggerChevron ? "pl-10 pr-10" : "pl-10 pr-3"
          } ${display ? "text-text-primary" : "text-text-secondary/50"}`}
        >
          {display ?? placeholder}
        </span>
        {showTriggerChevron ? (
          <ChevronDown
            className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/55 transition-transform ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        ) : null}
      </button>

      {typeof document !== "undefined" && popoverContent
        ? createPortal(popoverContent, document.body)
        : null}
    </div>
  );
}
