/** Dashboard date filter: inclusive YYYY-MM-DD bounds (local calendar). */

export type DashboardDateRange = { from: string; to: string };

/** Earliest date for “All time” (keeps charts bounded). */
export const DASHBOARD_ALL_TIME_FROM = "2020-01-01";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Default: last 7 days ending today (inclusive, local). */
export function defaultDashboardRange(): DashboardDateRange {
  const to = new Date();
  to.setHours(0, 0, 0, 0);
  const from = new Date(to);
  from.setDate(from.getDate() - 6);
  return { from: toLocalYmd(from), to: toLocalYmd(to) };
}

export type ParsedDashboardRange = DashboardDateRange & { isAllTime: boolean };

/**
 * Parse `from` / `to` / `range` query params. `range=all` → all time from anchor.
 * Otherwise: invalid values fall back to default; swaps if from > to;
 * clamps span to max 366 days (unless same as all-time anchor + today).
 */
export function parseDashboardRangeQuery(raw: {
  from?: string;
  to?: string;
  range?: string;
}): ParsedDashboardRange {
  if (raw.range === "all") {
    const to = new Date();
    to.setHours(0, 0, 0, 0);
    return {
      from: DASHBOARD_ALL_TIME_FROM,
      to: toLocalYmd(to),
      isAllTime: true,
    };
  }

  const def = defaultDashboardRange();
  let from = YMD.test(raw.from ?? "") ? raw.from! : def.from;
  let to = YMD.test(raw.to ?? "") ? raw.to! : def.to;
  if (from > to) {
    const t = from;
    from = to;
    to = t;
  }
  const fromD = parseLocalYmd(from);
  const toD = parseLocalYmd(to);
  const maxEnd = new Date(fromD);
  maxEnd.setDate(maxEnd.getDate() + 365);
  if (toD > maxEnd) {
    to = toLocalYmd(maxEnd);
  }
  return { from, to, isAllTime: false };
}

export function formatDashboardRangeLabel(from: string, to: string): string {
  const a = parseLocalYmd(from);
  const b = parseLocalYmd(to);
  if (from === to) {
    return a.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return `${a.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${b.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

/** Inclusive list of YYYY-MM-DD from `from` through `to` (local). */
export function enumerateDays(from: string, to: string): string[] {
  const out: string[] = [];
  const cur = parseLocalYmd(from);
  const end = parseLocalYmd(to);
  while (cur <= end) {
    out.push(toLocalYmd(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/**
 * Same inclusive span as [from, to], shifted to end the day before `from`
 * (for period-over-period comparisons on the dashboard).
 */
export function priorInclusiveRange(
  from: string,
  to: string
): { from: string; to: string } {
  const fromD = parseLocalYmd(from);
  const toD = parseLocalYmd(to);
  const spanDays = Math.max(
    0,
    Math.round((toD.getTime() - fromD.getTime()) / 86400000)
  );
  const prevTo = new Date(fromD);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - spanDays);
  return { from: toLocalYmd(prevFrom), to: toLocalYmd(prevTo) };
}
