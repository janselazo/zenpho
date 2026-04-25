"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  crmDatePlaceholder,
  crmDateTriggerClassName,
  CRM_SINGLE_DATE_PICKER_START_MONTH,
  crmFormatters,
  crmRdpCssVars,
  crmSingleDayClassNames,
  crmSingleDayModifiers,
  formatCrmDateTrigger,
} from "@/lib/crm/crm-day-picker-shared";

function parseYmdLocal(iso: string): Date | undefined {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

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
    return v ? parseYmdLocal(v) : undefined;
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setSelected(parseYmdLocal(value));
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

  const displayValue = isoValue
    ? formatCrmDateTrigger(isoValue, "presentation")
    : null;
  const placeholder = crmDatePlaceholder("presentation");
  const triggerClass = [crmDateTriggerClassName, "w-full min-w-0"]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={ref} className="relative w-full min-w-0">
      {name && <input type="hidden" name={name} value={isoValue} />}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Calendar
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/55"
          aria-hidden
        />
        <span
          className={`block w-full pl-10 pr-3 text-left text-sm tabular-nums ${
            displayValue ? "text-text-primary" : "text-text-secondary/50"
          }`}
        >
          {displayValue ?? placeholder}
        </span>
        <ChevronDown
          className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary/55 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-2xl border border-border bg-white shadow-lg ring-1 ring-black/5 dark:border-zinc-600 dark:bg-zinc-900 dark:ring-white/10 sm:right-auto sm:w-[min(100%,21rem)]">
          <div className="p-1 pt-3">
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={handleSelect}
              defaultMonth={selected ?? new Date()}
              showOutsideDays
              weekStartsOn={0}
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
                  return <ChevronDown className={className} size={dim} strokeWidth={2} aria-hidden />;
                },
              }}
              style={crmRdpCssVars}
            />
          </div>
        </div>
      )}
    </div>
  );
}
