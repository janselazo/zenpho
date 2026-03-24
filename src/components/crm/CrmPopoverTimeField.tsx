"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Clock } from "lucide-react";

/** Parse `HH:mm` (24h) from stored task value. */
function parseTime24(s: string): { h12: number; min: number; pm: boolean } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h24 = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isInteger(h24) || !Number.isInteger(min)) return null;
  if (h24 < 0 || h24 > 23 || min < 0 || min > 59) return null;
  const pm = h24 >= 12;
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return { h12, min, pm };
}

function toTime24(h12: number, min: number, pm: boolean): string {
  let h: number;
  if (!pm) {
    h = h12 === 12 ? 0 : h12;
  } else {
    h = h12 === 12 ? 12 : h12 + 12;
  }
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function formatDisplay24(s: string): string | null {
  const p = parseTime24(s);
  if (!p) return null;
  const ap = p.pm ? "PM" : "AM";
  return `${p.h12}:${String(p.min).padStart(2, "0")} ${ap}`;
}

type Props = {
  id: string;
  value: string;
  onChange: (hhmm: string) => void;
  triggerClassName: string;
};

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => i);

export default function CrmPopoverTimeField({
  id,
  value,
  onChange,
  triggerClassName,
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

  const [h12, setH12] = useState(9);
  const [minute, setMinute] = useState(0);
  const [pm, setPm] = useState(false);

  const display = value.trim() ? formatDisplay24(value) : null;

  const updatePopoverPosition = () => {
    const el = triggerWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const estimatedHeight = 220;
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
    const p = parseTime24(value);
    if (p) {
      setH12(p.h12);
      setMinute(p.min);
      setPm(p.pm);
    } else {
      setH12(9);
      setMinute(0);
      setPm(false);
    }
    updatePopoverPosition();
    window.addEventListener("scroll", updatePopoverPosition, true);
    window.addEventListener("resize", updatePopoverPosition);
    return () => {
      window.removeEventListener("scroll", updatePopoverPosition, true);
      window.removeEventListener("resize", updatePopoverPosition);
    };
  }, [open, value]);

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

  function applyTime(nextH12: number, nextMinute: number, nextPm: boolean) {
    setH12(nextH12);
    setMinute(nextMinute);
    setPm(nextPm);
    onChange(toTime24(nextH12, nextMinute, nextPm));
  }

  const pickBtn =
    "flex w-full items-center justify-center rounded-md px-2 py-1.5 text-sm font-medium transition-colors";
  const pickBtnActive =
    "bg-blue-600 text-white shadow-sm dark:bg-blue-600";
  const pickBtnIdle =
    "text-text-primary hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800";

  const popoverContent = open && popoverPos && (
    <div
      ref={popoverRef}
      className="z-[280] w-[min(calc(100vw-1.5rem),18rem)] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.25)] dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]"
      style={{
        position: "fixed",
        left: Math.max(
          12,
          Math.min(popoverPos.left, window.innerWidth - 12 - 288)
        ),
        ...(popoverPos.flipUp
          ? {
              bottom: window.innerHeight - popoverPos.triggerTop + 8,
              top: "auto",
            }
          : { top: popoverPos.top, bottom: "auto" }),
      }}
      role="dialog"
      aria-label="Choose time"
    >
      <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Time
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 p-3">
        <div className="min-w-0">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-text-secondary">
            Hour
          </p>
          <div
            className="max-h-[11.5rem] overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/80 p-1 dark:border-zinc-600 dark:bg-zinc-800/50"
            role="listbox"
            aria-label="Hour"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
              <button
                key={h}
                type="button"
                role="option"
                aria-selected={h === h12}
                className={`${pickBtn} ${h === h12 ? pickBtnActive : pickBtnIdle}`}
                onClick={() => applyTime(h, minute, pm)}
              >
                {h}
              </button>
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-text-secondary">
            Min
          </p>
          <div
            className="max-h-[11.5rem] overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50/80 p-1 dark:border-zinc-600 dark:bg-zinc-800/50"
            role="listbox"
            aria-label="Minute"
          >
            {MINUTE_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                role="option"
                aria-selected={n === minute}
                className={`${pickBtn} font-mono tabular-nums ${n === minute ? pickBtnActive : pickBtnIdle}`}
                onClick={() => applyTime(h12, n, pm)}
              >
                {String(n).padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-text-secondary">
            Period
          </p>
          <div className="space-y-1 rounded-lg border border-zinc-200 bg-zinc-50/80 p-1 dark:border-zinc-600 dark:bg-zinc-800/50">
            <button
              type="button"
              className={`${pickBtn} ${!pm ? pickBtnActive : pickBtnIdle}`}
              onClick={() => applyTime(h12, minute, false)}
            >
              AM
            </button>
            <button
              type="button"
              className={`${pickBtn} ${pm ? pickBtnActive : pickBtnIdle}`}
              onClick={() => applyTime(h12, minute, true)}
            >
              PM
            </button>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-zinc-200 px-3 py-2.5 dark:border-zinc-700">
        <button
          type="button"
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
          onClick={() => {
            onChange("");
            setOpen(false);
          }}
        >
          Clear
        </button>
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
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
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName}
      >
        <Clock
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/55"
          aria-hidden
        />
        <span
          className={`block w-full pl-10 pr-10 text-left text-sm tabular-nums ${
            display ? "text-text-primary dark:text-zinc-100" : "text-text-secondary/50"
          }`}
        >
          {display ?? "No time"}
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
