"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/src/style.css";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface DatePickerProps {
  value?: string;
  defaultValue?: string;
  onChange?: (date: string) => void;
  name?: string;
}

export default function DatePicker({
  value,
  defaultValue,
  onChange,
  name,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Date | undefined>(() => {
    const v = value ?? defaultValue;
    return v ? new Date(v + "T12:00:00") : undefined;
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setSelected(new Date(value + "T12:00:00"));
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleSelect = useCallback(
    (day: Date | undefined) => {
      if (!day) return;
      setSelected(day);
      setOpen(false);
      const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      onChange?.(iso);
    },
    [onChange]
  );

  const isoValue = selected
    ? `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, "0")}-${String(selected.getDate()).padStart(2, "0")}`
    : "";

  const displayValue = selected
    ? selected.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Pick a date";

  return (
    <div ref={ref} className="relative">
      {name && <input type="hidden" name={name} value={isoValue} />}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none transition-colors hover:border-zinc-400 focus:border-accent dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500 dark:focus:border-blue-500"
      >
        <Calendar className="h-3.5 w-3.5 text-text-secondary dark:text-zinc-400" />
        <span className={selected ? "" : "text-text-secondary dark:text-zinc-500"}>
          {displayValue}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 rounded-xl border border-border bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected ?? new Date()}
            showOutsideDays
            classNames={{
              root: "rdp-custom",
              months: "flex flex-col",
              month_caption: "flex items-center justify-center py-1",
              caption_label: "text-sm font-semibold text-text-primary dark:text-zinc-100",
              nav: "flex items-center justify-between absolute inset-x-0 top-3 px-1",
              button_previous: "rounded-lg p-1 text-text-secondary hover:bg-surface dark:text-zinc-400 dark:hover:bg-zinc-800",
              button_next: "rounded-lg p-1 text-text-secondary hover:bg-surface dark:text-zinc-400 dark:hover:bg-zinc-800",
              weekdays: "grid grid-cols-7 mt-2",
              weekday: "text-[11px] font-medium text-text-secondary dark:text-zinc-500 text-center w-9",
              weeks: "mt-1",
              week: "grid grid-cols-7",
              day: "text-center",
              day_button:
                "inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors hover:bg-surface dark:hover:bg-zinc-800 focus:outline-none",
              selected:
                "!bg-accent !text-white dark:!bg-blue-600 rounded-lg",
              today:
                "font-bold text-accent dark:text-blue-400",
              outside:
                "text-text-secondary/40 dark:text-zinc-600",
              disabled: "opacity-30",
            }}
            components={{
              Chevron: ({ orientation }) =>
                orientation === "left" ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                ),
            }}
          />
        </div>
      )}
    </div>
  );
}
