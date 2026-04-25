const MONTHLY_GOAL_NORTH_STAR_IDS_KEY = "monthly-goal-north-star-ids";

function parseGoalIdsJson(parsed: unknown): string[] | null {
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

export function loadNorthStarGoalIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MONTHLY_GOAL_NORTH_STAR_IDS_KEY);
    if (!raw) return [];
    return parseGoalIdsJson(JSON.parse(raw) as unknown) ?? [];
  } catch {
    return [];
  }
}

export function saveNorthStarGoalIds(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MONTHLY_GOAL_NORTH_STAR_IDS_KEY, JSON.stringify(ids));
  } catch {
    // ignore quota / private mode
  }
}

export function pruneNorthStarGoalIds(
  goalIds: string[],
  existingGoalIds: readonly string[]
): string[] {
  const valid = new Set(existingGoalIds);
  return goalIds.filter((id) => valid.has(id));
}
