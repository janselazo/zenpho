import type { PlanStage } from "@/lib/crm/mock-data";
import { PLAN_LABELS } from "@/lib/crm/mock-data";
import type { WorkspaceResource } from "@/lib/crm/project-workspace-types";

/** Linear-style delivery status on child `project.metadata.deliveryStatus`. */
export const CHILD_DELIVERY_STATUSES = [
  "backlog",
  "planned",
  "in_progress",
  "completed",
  "canceled",
] as const;

export type ChildDeliveryStatus = (typeof CHILD_DELIVERY_STATUSES)[number];

export const CHILD_DELIVERY_STATUS_LABELS: Record<ChildDeliveryStatus, string> = {
  backlog: "Backlog",
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  canceled: "Canceled",
};

/** Maps UI status to existing `plan_stage` check constraint. */
export const DELIVERY_STATUS_TO_PLAN_STAGE: Record<ChildDeliveryStatus, PlanStage> = {
  backlog: "pipeline",
  planned: "planning",
  in_progress: "mvp",
  completed: "growth",
  canceled: "pipeline",
};

export type ChildProjectPriority = "low" | "medium" | "high" | "urgent";

/** Delivery milestones stored on child `project.metadata.milestones`. */
export type ProductMilestoneMeta = {
  id: string;
  title: string;
  targetDate?: string | null;
};

export const DEFAULT_PRODUCT_MILESTONES: Omit<ProductMilestoneMeta, "id">[] = [
  { title: "Design" },
  { title: "Development" },
  { title: "Testing" },
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseChildDeliveryStatus(
  metadata: unknown
): ChildDeliveryStatus | null {
  if (!isRecord(metadata)) return null;
  const v = metadata.deliveryStatus;
  if (typeof v !== "string") return null;
  return (CHILD_DELIVERY_STATUSES as readonly string[]).includes(v)
    ? (v as ChildDeliveryStatus)
    : null;
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
  if (p === "mvp") return "in_progress";
  if (p === "growth") return "completed";
  return "backlog";
}

/** Visual order for grouped project lists (active work first). */
export const CHILD_PROJECT_GROUP_ORDER: ChildDeliveryStatus[] = [
  "in_progress",
  "planned",
  "backlog",
  "completed",
  "canceled",
];

export function childProjectStatusDisplay(
  metadata: unknown,
  planStage: string | null | undefined
): string {
  const d = parseChildDeliveryStatus(metadata);
  if (d) return CHILD_DELIVERY_STATUS_LABELS[d];
  const p = typeof planStage === "string" ? planStage.trim().toLowerCase() : "";
  if (p === "pipeline" || p === "planning" || p === "mvp" || p === "growth") {
    return PLAN_LABELS[p as PlanStage];
  }
  if (p) {
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

export function milestonesWithDefaults(metadata: unknown): ProductMilestoneMeta[] {
  const parsed = parseProductMilestones(metadata);
  if (parsed.length > 0) return parsed;
  return DEFAULT_PRODUCT_MILESTONES.map((m, i) => ({
    id: `default-${i}-${m.title.toLowerCase().replace(/\s+/g, "-")}`,
    title: m.title,
    targetDate: null,
  }));
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
    const kind = item.kind === "doc" || item.kind === "design" || item.kind === "repo" || item.kind === "other"
      ? item.kind
      : "other";
    if (!id || !label || !url) continue;
    out.push({ id, label, url, kind });
  }
  return out;
}
