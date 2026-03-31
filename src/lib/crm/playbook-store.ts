import type { PlaybookCategory } from "@/lib/crm/mock-data";

const STORAGE_KEY = "playbook-completions";
const PLAYBOOK_STRUCTURE_KEY = "playbook-categories";
/** Ordered activity ids for the pinned Priorities section (references activities in categories). */
const PLAYBOOK_PRIORITY_ACTIVITY_IDS_KEY = "playbook-priority-activity-ids";
/** Which playbook sections are collapsed (key = category id). Persisted across tab switches / remounts. */
const PLAYBOOK_SECTIONS_COLLAPSED_KEY = "playbook-sections-collapsed";

/** Fired after local structure save or successful remote upsert (see playbook-remote). */
export const PLAYBOOK_STRUCTURE_CHANGED_EVENT = "crm-playbook-structure-changed";

function isPlaybookActivity(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.title === "string" &&
    typeof o.points === "number" &&
    typeof o.target === "number" &&
    typeof o.timeEstimate === "string"
  );
}

function isPlaybookCategory(v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.name !== "string" ||
    typeof o.icon !== "string" ||
    typeof o.color !== "string" ||
    !Array.isArray(o.activities)
  ) {
    return false;
  }
  return (o.activities as unknown[]).every(isPlaybookActivity);
}

/** Calendar day key `YYYY-M-D` for daily completion rollover (matches prior localStorage behavior). */
export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Parse categories from DB or localStorage JSON. `null` input → `[]`. Invalid shape → `null`. */
export function parseCategoriesJson(parsed: unknown): PlaybookCategory[] | null {
  if (parsed == null) return [];
  if (!Array.isArray(parsed)) return null;
  if (!parsed.every(isPlaybookCategory)) return null;
  return parsed as PlaybookCategory[];
}

/** Today's completion counts from stored document; empty if wrong day or invalid. */
export function parseCompletionsDocument(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  if (o._date !== todayKey()) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(o)) {
    if (k === "_date") continue;
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "string") {
      const n = Number(v);
      if (Number.isFinite(n)) out[k] = n;
    }
  }
  return out;
}

export function serializeCompletionsForStorage(
  completions: Record<string, number>
): Record<string, string | number> {
  return { _date: todayKey(), ...completions };
}

/** `null` = no local data (keep app default seed). */
export function loadPlaybookCategories(): PlaybookCategory[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PLAYBOOK_STRUCTURE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    const cats = parseCategoriesJson(parsed);
    if (cats === null) return null;
    return cats;
  } catch {
    return null;
  }
}

export function savePlaybookCategories(categories: PlaybookCategory[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PLAYBOOK_STRUCTURE_KEY, JSON.stringify(categories));
    window.dispatchEvent(new Event(PLAYBOOK_STRUCTURE_CHANGED_EVENT));
  } catch {
    // storage full or unavailable
  }
}

function collectActivityIds(categories: PlaybookCategory[]): Set<string> {
  const ids = new Set<string>();
  for (const c of categories) {
    for (const a of c.activities) {
      ids.add(a.id);
    }
  }
  return ids;
}

/** Keep only ids that still exist in the current category tree. */
export function prunePriorityActivityIds(
  categories: PlaybookCategory[],
  priorityActivityIds: string[]
): string[] {
  const valid = collectActivityIds(categories);
  return priorityActivityIds.filter((id) => valid.has(id));
}

function parsePriorityActivityIdsJson(parsed: unknown): string[] | null {
  if (!Array.isArray(parsed)) return null;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of parsed) {
    if (typeof item !== "string" || !item) continue;
    if (seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

/** Normalize DB / JSON value to a string id list. */
export function parsePriorityActivityIdsFromUnknown(raw: unknown): string[] {
  return parsePriorityActivityIdsJson(raw) ?? [];
}

/** Load persisted Priorities ordering; `[]` if missing or invalid. */
export function loadPlaybookPriorityActivityIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PLAYBOOK_PRIORITY_ACTIVITY_IDS_KEY);
    if (!raw) return [];
    const parsed = parsePriorityActivityIdsJson(JSON.parse(raw) as unknown);
    return parsed ?? [];
  } catch {
    return [];
  }
}

export function savePlaybookPriorityActivityIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      PLAYBOOK_PRIORITY_ACTIVITY_IDS_KEY,
      JSON.stringify(ids)
    );
  } catch {
    // storage full or unavailable
  }
}

export function getCompletions(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parseCompletionsDocument(parsed);
  } catch {
    return {};
  }
}

export function saveCompletions(completions: Record<string, number>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(serializeCompletionsForStorage(completions))
    );
  } catch {
    // storage full or unavailable
  }
}

/** Collapsed section ids (`true` = collapsed). Unknown keys default to expanded in the UI. */
export function loadPlaybookSectionCollapsed(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PLAYBOOK_SECTIONS_COLLAPSED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k === "string" && v === true) out[k] = true;
    }
    return out;
  } catch {
    return {};
  }
}

export function savePlaybookSectionCollapsed(collapsed: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  try {
    const stripped: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(collapsed)) {
      if (v) stripped[k] = true;
    }
    localStorage.setItem(
      PLAYBOOK_SECTIONS_COLLAPSED_KEY,
      JSON.stringify(stripped)
    );
  } catch {
    // storage full or unavailable
  }
}
