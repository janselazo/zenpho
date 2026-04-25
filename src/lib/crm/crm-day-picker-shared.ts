import type { CSSProperties } from "react";
import type { ClassNames, ModifiersClassNames, Formatters } from "react-day-picker";

/** Reference design: #3B82F6 (Tailwind blue-500) */
export const CRM_CALENDAR_SELECT_BLUE = "bg-blue-500 hover:bg-blue-500 focus:bg-blue-500";

/**
 * Single-date `DayPicker` navigation lower bound. Do not set a matching
 * `endMonth` for deadline / expected-end fields: react-day-picker v9 uses
 * `endOfMonth(endMonth)` as an internal `maxDate` for the day grid, which can
 * incorrectly clamp later days in the view if combined with the nav range.
 */
export const CRM_SINGLE_DATE_PICKER_START_MONTH = new Date(2000, 0, 1);

const WEEKDAY_2: Record<number, string> = {
  0: "Su",
  1: "Mo",
  2: "Tu",
  3: "We",
  4: "Th",
  5: "Fr",
  6: "Sa",
};

/** Two-letter row (Su, Mo, …) per design spec */
export const crmFormatters: Partial<Formatters> = {
  formatWeekdayName: (d) => WEEKDAY_2[d.getDay()] ?? "",
};

function parseYmdLocal(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Single-date field trigger: "Sun, Apr 26, 2026" (design), "Apr 26, 2026" (medium), or US numeric.
 */
export function formatCrmDateTrigger(
  value: string,
  displayFormat: "presentation" | "medium" | "numeric"
): string {
  if (!value?.trim()) return "";
  const d = parseYmdLocal(value);
  if (!d || Number.isNaN(d.getTime())) return value;
  if (displayFormat === "numeric") {
    return new Intl.DateTimeFormat("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    }).format(d);
  }
  if (displayFormat === "medium") {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  }
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function crmDatePlaceholder(
  displayFormat: "presentation" | "medium" | "numeric"
): string {
  if (displayFormat === "numeric") return "mm/dd/yyyy";
  if (displayFormat === "medium") return "mm / dd / yyyy";
  return "Select a date";
}

/** Shared rdp v9 `classNames` for single-day calendar (popover). */
export const crmSingleDayClassNames: Partial<ClassNames> = {
  months: "relative w-full",
  month: "relative w-full space-y-0 px-2 pb-1",
  month_caption:
    "relative z-[1] mb-1 flex h-9 items-center justify-center px-9 sm:px-10",
  caption_label:
    "text-sm font-semibold text-text-primary tabular-nums dark:text-zinc-100",
  nav: "absolute inset-x-1.5 top-2.5 z-0 flex items-center justify-between",
  button_previous:
    "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:text-zinc-300 dark:hover:bg-zinc-800",
  button_next:
    "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:text-zinc-300 dark:hover:bg-zinc-800",
  weekdays:
    "mb-1.5 flex w-full border-b border-zinc-200/90 px-0.5 pb-2 dark:border-zinc-600/80",
  weekday:
    "h-6 w-9 p-0 text-center text-[0.7rem] font-medium text-zinc-500 dark:text-zinc-400",
  week: "mt-0 flex w-full",
  day: "p-0 text-center",
  day_button:
    "m-0.5 h-9 w-9 rounded-lg border-2 border-transparent text-sm font-medium text-zinc-900 outline-none transition-colors hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:text-zinc-100 dark:hover:bg-zinc-800",
};

export const crmSingleDayModifiers: ModifiersClassNames = {
  today:
    "[&_button]:z-0 [&_button]:rounded-lg [&_button]:font-medium [&_button]:text-zinc-900 [&_button]:!bg-zinc-100/90 dark:[&_button]:!bg-zinc-800 [&_button]:!ring-0",
  selected:
    "[&_button]:!z-[1] [&_button]:!border-transparent [&_button]:!bg-blue-500 [&_button]:!text-white [&_button]:!shadow-sm [&_button]:hover:!bg-blue-500 [&_button]:focus:!bg-blue-500 dark:[&_button]:!bg-blue-500",
  outside: "text-zinc-400 opacity-60 dark:text-zinc-500",
  disabled: "opacity-40",
};

export const crmRdpCssVars = {
  "--rdp-accent-color": "#3b82f6",
  "--rdp-accent-background-color": "rgba(59, 130, 246, 0.12)",
  "--rdp-day_button-height": "2.25rem",
  "--rdp-day_button-width": "2.25rem",
  "--rdp-nav-height": "2.25rem",
  "--rdp-selected-border": "2px solid transparent",
  "--rdp-day_button-border": "2px solid transparent",
} as CSSProperties;

/** Base trigger: light surface, left calendar icon, no trailing chevron (design ref). */
export const crmDateTriggerClassName =
  "relative flex w-full min-h-[2.75rem] items-center gap-0 rounded-xl border border-zinc-200 bg-zinc-50/95 pl-10 pr-3 text-left text-sm font-medium text-text-primary shadow-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-100 dark:focus:border-blue-500";

/** Range / dual-month day cells: align with same blue as single. */
export const crmRangeDayClassNames: Partial<ClassNames> = {
  months: "flex flex-col gap-4 sm:flex-row sm:gap-6",
  month: "relative space-y-2",
  month_caption: "mb-1 flex h-8 items-center justify-center",
  caption_label: "text-sm font-semibold text-text-primary tabular-nums dark:text-zinc-100",
  nav: "absolute inset-x-0 top-2 flex items-center justify-between px-0.5",
  button_previous:
    "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
  button_next:
    "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
  weekdays: "mb-1 flex w-full border-b border-zinc-200/80 pb-1.5 dark:border-zinc-600/60",
  weekday:
    "h-6 w-8 sm:w-9 p-0 text-center text-[0.7rem] font-medium text-zinc-500 dark:text-zinc-400",
  week: "mt-0 flex w-full",
  day: "p-0",
  day_button:
    "m-0.5 h-9 w-8 sm:w-9 rounded-lg border-2 border-transparent text-sm font-medium text-zinc-900 outline-none transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 dark:text-zinc-100 dark:hover:bg-zinc-800",
};

export const crmRangeDayModifiers: ModifiersClassNames = {
  today:
    "[&_button]:font-medium [&_button]:text-zinc-900 [&_button]:!bg-zinc-100/90 dark:[&_button]:!bg-zinc-800/90",
  range_start:
    "[&_button]:!z-[1] [&_button]:!border-transparent [&_button]:!bg-blue-500 [&_button]:!text-white",
  range_end:
    "[&_button]:!z-[1] [&_button]:!border-transparent [&_button]:!bg-blue-500 [&_button]:!text-white",
  range_middle:
    "[&_button]:!bg-blue-100 [&_button]:!text-blue-900 dark:[&_button]:!bg-blue-500/20 dark:[&_button]:!text-blue-100",
  outside: "text-zinc-400 opacity-55 dark:text-zinc-500",
};

export const crmRangeRdpCssVars: CSSProperties = { ...crmRdpCssVars };
