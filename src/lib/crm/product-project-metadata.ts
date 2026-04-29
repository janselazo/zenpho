import { labelForStoredPlanStage } from "@/lib/crm/map-project-row";
import type { PlanStage } from "@/lib/crm/mock-data";
import type { WorkspaceResource } from "@/lib/crm/project-workspace-types";

/** Linear-style delivery status on child `project.metadata.deliveryStatus`. */
export const CHILD_DELIVERY_STATUSES = [
  "backlog",
  "planned",
  "in_progress",
  "in_review",
  "testing",
  "production",
] as const;

export type ChildDeliveryStatus = (typeof CHILD_DELIVERY_STATUSES)[number];

/** Old slugs in stored metadata → current `ChildDeliveryStatus`. */
export const LEGACY_CHILD_DELIVERY_SLUG_MAP: Record<string, ChildDeliveryStatus> = {
  completed: "production",
  canceled: "backlog",
};

export const CHILD_DELIVERY_STATUS_LABELS: Record<ChildDeliveryStatus, string> = {
  backlog: "Backlog",
  planned: "Planned",
  in_progress: "In Progress",
  in_review: "In Review",
  testing: "Testing",
  production: "Production",
};

/** Maps delivery UI status to root/child `plan_stage`. */
export const DELIVERY_STATUS_TO_PLAN_STAGE: Record<ChildDeliveryStatus, PlanStage> = {
  backlog: "backlog",
  planned: "planning",
  in_progress: "building",
  in_review: "building",
  testing: "testing",
  production: "release",
};

export type ChildProjectPriority = "low" | "medium" | "high" | "urgent";

export const CHILD_PROJECT_PRIORITY_LABELS: Record<ChildProjectPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

/** Delivery milestones stored on child `project.metadata.milestones`. */
export type ProductMilestoneMeta = {
  id: string;
  title: string;
  /** Due date (YYYY-MM-DD). */
  targetDate?: string | null;
};

/** Stable ids so tasks can link via `productMilestoneId` before first save. */
export const DEFAULT_PRODUCT_DELIVERY_MILESTONES: ProductMilestoneMeta[] = [
  { id: "delivery-milestone-poc", title: "POC", targetDate: null },
  {
    id: "delivery-milestone-internal-release",
    title: "Internal Release",
    targetDate: null,
  },
  {
    id: "delivery-milestone-private-beta",
    title: "Private Beta",
    targetDate: null,
  },
  {
    id: "delivery-milestone-public-launch",
    title: "Public Launch",
    targetDate: null,
  },
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const CHILD_PRIORITY_SET = new Set<string>([
  "low",
  "medium",
  "high",
  "urgent",
]);

export function parseChildProjectPriority(
  metadata: unknown
): ChildProjectPriority | null {
  if (!isRecord(metadata)) return null;
  const v = metadata.priority;
  if (typeof v !== "string" || !CHILD_PRIORITY_SET.has(v)) return null;
  return v as ChildProjectPriority;
}

export function parseChildDeliveryStatus(
  metadata: unknown
): ChildDeliveryStatus | null {
  if (!isRecord(metadata)) return null;
  const v = metadata.deliveryStatus;
  if (typeof v !== "string") return null;
  const raw = v.trim();
  const lower = raw.toLowerCase();
  if ((CHILD_DELIVERY_STATUSES as readonly string[]).includes(lower)) {
    return lower as ChildDeliveryStatus;
  }
  return LEGACY_CHILD_DELIVERY_SLUG_MAP[raw] ?? LEGACY_CHILD_DELIVERY_SLUG_MAP[lower] ?? null;
}

/** Resolve group bucket for a child project row (metadata + legacy plan_stage). */
export function resolveChildDeliveryGroup(
  metadata: unknown,
  planStage: string | null | undefined
): ChildDeliveryStatus {
  const d = parseChildDeliveryStatus(metadata);
  if (d) return d;
  const p = typeof planStage === "string" ? planStage.trim().toLowerCase() : "";
  if (p === "planning") return "planned";
  if (p === "building" || p === "mvp") return "in_progress";
  if (p === "testing") return "testing";
  if (p === "release" || p === "growth") return "production";
  if (p === "pipeline") return "backlog";
  return "backlog";
}

/** Default column order on the Project tab (product child rows). */
export const CHILD_PROJECT_GROUP_ORDER: ChildDeliveryStatus[] = [
  "backlog",
  "planned",
  "in_progress",
  "in_review",
  "testing",
  "production",
];

export function childProjectStatusDisplay(
  metadata: unknown,
  planStage: string | null | undefined,
  planLabelMap?: Record<string, string>
): string {
  const d = parseChildDeliveryStatus(metadata);
  if (d) return CHILD_DELIVERY_STATUS_LABELS[d];
  const p = typeof planStage === "string" ? planStage.trim().toLowerCase() : "";
  if (p) {
    const fromPlan = labelForStoredPlanStage(planStage, planLabelMap);
    if (fromPlan) return fromPlan;
    return p.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
  }
  return "";
}

export function parseProductMilestones(metadata: unknown): ProductMilestoneMeta[] {
  if (!isRecord(metadata)) return [];
  const raw = metadata.milestones;
  if (!Array.isArray(raw)) return [];
  const out: ProductMilestoneMeta[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : "";
    const title = typeof item.title === "string" ? item.title.trim() : "";
    if (!id || !title) continue;
    const targetDate =
      typeof item.targetDate === "string" && item.targetDate.trim()
        ? item.targetDate.trim().slice(0, 10)
        : null;
    out.push({ id, title, targetDate: targetDate || null });
  }
  return out;
}

/**
 * Parsed milestones from metadata, or the default delivery ladder when none exist.
 */
export function milestonesWithDefaults(metadata: unknown): ProductMilestoneMeta[] {
  const parsed = parseProductMilestones(metadata);
  if (parsed.length > 0) return parsed;
  return DEFAULT_PRODUCT_DELIVERY_MILESTONES.map((m) => ({ ...m }));
}

export function parseProductResources(metadata: unknown): WorkspaceResource[] {
  if (!isRecord(metadata)) return [];
  const raw = metadata.productResources;
  if (!Array.isArray(raw)) return [];
  const out: WorkspaceResource[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = typeof item.id === "string" ? item.id : "";
    const label = typeof item.label === "string" ? item.label.trim() : "";
    const url = typeof item.url === "string" ? item.url.trim() : "";
    const kind =
      item.kind === "doc" ||
      item.kind === "design" ||
      item.kind === "repo" ||
      item.kind === "website" ||
      item.kind === "other"
        ? item.kind
        : "other";
    if (!id || !label || !url) continue;
    out.push({ id, label, url, kind });
  }
  return out;
}
