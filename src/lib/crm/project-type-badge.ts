/** Soft pill classes for product / lead project type (aligned with Leads table type colors). */
const KNOWN: Record<string, string> = {
  "custom websites":
    "bg-cyan-100 text-cyan-900 dark:bg-cyan-950/45 dark:text-cyan-200",
  "websites development":
    "bg-cyan-100 text-cyan-900 dark:bg-cyan-950/45 dark:text-cyan-200",
  "ai automations":
    "bg-violet-100 text-violet-900 dark:bg-violet-950/45 dark:text-violet-200",
  "ai automation":
    "bg-violet-100 text-violet-900 dark:bg-violet-950/45 dark:text-violet-200",
  "web apps":
    "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200",
  "mobile apps":
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/45 dark:text-emerald-200",
  "mvp dev":
    "bg-cyan-100 text-cyan-900 dark:bg-cyan-950/45 dark:text-cyan-200",
  "web app":
    "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200",
  "mobile app":
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/45 dark:text-emerald-200",
  website:
    "bg-cyan-100 text-cyan-900 dark:bg-cyan-950/45 dark:text-cyan-200",
  "ecommerce store":
    "bg-amber-100 text-amber-950 dark:bg-amber-950/35 dark:text-amber-200",
  other:
    "bg-violet-100 text-violet-900 dark:bg-violet-950/45 dark:text-violet-200",
};

const FALLBACK = [
  "bg-slate-100 text-slate-800 dark:bg-slate-800/55 dark:text-slate-100",
  "bg-teal-100 text-teal-900 dark:bg-teal-950/40 dark:text-teal-200",
  "bg-orange-100 text-orange-900 dark:bg-orange-950/35 dark:text-orange-200",
] as const;

export function projectTypeBadgeClass(projectType: string): string {
  const key = projectType.trim().toLowerCase();
  if (KNOWN[key]) return KNOWN[key];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return FALLBACK[Math.abs(h) % FALLBACK.length];
}
