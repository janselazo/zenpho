/** Standard milestone ladder for phase projects (tasks + UI). */

export const MILESTONE_KEYS = [
  "discovery",
  "wireframing",
  "design",
  "development",
  "testing",
  "deployment",
  "feedback",
  "unassigned",
] as const;

export type MilestoneKey = (typeof MILESTONE_KEYS)[number];

export const MILESTONE_LABELS: Record<MilestoneKey, string> = {
  discovery: "Discovery & research",
  wireframing: "Wireframing",
  design: "Design",
  development: "Development",
  testing: "Testing",
  deployment: "Deployment",
  feedback: "Feedback",
  unassigned: "Unassigned",
};

/** Ordered keys for boards (excludes unassigned last in UI — handled separately). */
export const MILESTONE_ORDER: MilestoneKey[] = [
  "discovery",
  "wireframing",
  "design",
  "development",
  "testing",
  "deployment",
  "feedback",
];

export function isMilestoneKey(v: string): v is MilestoneKey {
  return (MILESTONE_KEYS as readonly string[]).includes(v);
}

export function parseMilestoneKey(v: string | null | undefined): MilestoneKey {
  const s = (v ?? "unassigned").trim();
  return isMilestoneKey(s) ? s : "unassigned";
}
