import type { WorkspaceResource } from "@/lib/crm/project-workspace-types";

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
