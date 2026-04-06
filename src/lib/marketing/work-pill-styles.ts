import type { ProjectCategory } from "@/lib/data";

/** Top-row type pill + filter “selected” + default result pill per portfolio category. */
export const WORK_CATEGORY_LABELS: Record<ProjectCategory, string> = {
  "mobile-app": "Mobile App",
  "web-app": "Web App",
  website: "Website",
  ecommerce: "Ecommerce Store",
};

const TYPE_BASE =
  "rounded-full border px-2 py-0.5 text-[10px] font-semibold";

const RESULT_BASE = "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold";

export const WORK_CATEGORY_TYPE_PILL_CLASS: Record<ProjectCategory, string> = {
  "mobile-app": `${TYPE_BASE} border-emerald-200/90 bg-emerald-50 text-emerald-900 dark:border-emerald-800/55 dark:bg-emerald-950/45 dark:text-emerald-100`,
  "web-app": `${TYPE_BASE} border-sky-200/90 bg-sky-50 text-sky-900 dark:border-sky-800/55 dark:bg-sky-950/45 dark:text-sky-100`,
  website: `${TYPE_BASE} border-violet-200/90 bg-violet-50 text-violet-900 dark:border-violet-800/55 dark:bg-violet-950/45 dark:text-violet-100`,
  ecommerce: `${TYPE_BASE} border-amber-200/90 bg-amber-50 text-amber-950 dark:border-amber-800/55 dark:bg-amber-950/35 dark:text-amber-100`,
};

export const WORK_CATEGORY_FILTER_ACTIVE_CLASS: Record<ProjectCategory, string> = {
  "mobile-app":
    "border-emerald-500/80 bg-emerald-500/10 text-emerald-900 dark:border-emerald-500/45 dark:bg-emerald-950/55 dark:text-emerald-100",
  "web-app":
    "border-sky-500/80 bg-sky-500/10 text-sky-900 dark:border-sky-500/45 dark:bg-sky-950/55 dark:text-sky-100",
  website:
    "border-violet-500/80 bg-violet-500/10 text-violet-900 dark:border-violet-500/45 dark:bg-violet-950/55 dark:text-violet-100",
  ecommerce:
    "border-amber-500/80 bg-amber-500/10 text-amber-950 dark:border-amber-500/45 dark:bg-amber-950/40 dark:text-amber-100",
};

/** Result / metrics pill: color follows the outcome label (may differ from row-one category). */
export function workResultPillClass(result: string): string {
  const r = result.trim().toLowerCase();
  if (r.includes("ecommerce") || r.includes("e-commerce")) {
    return `${RESULT_BASE} border-amber-200/90 bg-amber-50 text-amber-950 dark:border-amber-800/55 dark:bg-amber-950/35 dark:text-amber-100`;
  }
  if (r.includes("mobile")) {
    return `${RESULT_BASE} border-emerald-200/90 bg-emerald-50 text-emerald-900 dark:border-emerald-800/55 dark:bg-emerald-950/45 dark:text-emerald-100`;
  }
  if (r.includes("web app") || r === "web apps") {
    return `${RESULT_BASE} border-sky-200/90 bg-sky-50 text-sky-900 dark:border-sky-800/55 dark:bg-sky-950/45 dark:text-sky-100`;
  }
  if (r.includes("website") && !r.includes("ecommerce")) {
    return `${RESULT_BASE} border-violet-200/90 bg-violet-50 text-violet-900 dark:border-violet-800/55 dark:bg-violet-950/45 dark:text-violet-100`;
  }
  return `${RESULT_BASE} border-sky-200/90 bg-sky-50 text-sky-900 dark:border-sky-800/55 dark:bg-sky-950/45 dark:text-sky-100`;
}
