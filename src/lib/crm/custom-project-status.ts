import { contrastTextForBg, normalizeHexColor } from "@/lib/crm/child-delivery-status-ui";
import {
  CHILD_DELIVERY_STATUSES,
  LEGACY_CHILD_DELIVERY_SLUG_MAP,
  type ChildDeliveryStatus,
  resolveChildDeliveryGroup,
} from "@/lib/crm/product-project-metadata";

export const PROJECTS_TAB_GROUP_ID_KEY = "projectsTabGroupId" as const;
export const CUSTOM_PROJECT_STATUSES_KEY = "customProjectStatuses" as const;

export const BUILT_IN_TAB_GROUP_IDS = new Set<string>(CHILD_DELIVERY_STATUSES);

export type CustomProjectStatusRow = {
  id: string;
  label: string;
  color: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseCustomProjectStatuses(metadata: unknown): CustomProjectStatusRow[] {
  if (!isRecord(metadata)) return [];
  const raw = metadata[CUSTOM_PROJECT_STATUSES_KEY];
  if (!Array.isArray(raw)) return [];
  const out: CustomProjectStatusRow[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : "";
    const label =
      typeof item.label === "string" && item.label.trim() ? item.label.trim() : "";
    const color = normalizeHexColor(
      typeof item.color === "string" ? item.color : null
    );
    if (!id || !label || !color) continue;
    out.push({ id, label, color });
  }
  return out;
}

/** Which Projects-tab column this child belongs to (built-in key or custom id). */
export function resolveProjectsTabGroupId(
  metadata: unknown,
  planStage: string | null | undefined,
  validCustomIds: Set<string>
): string {
  if (isRecord(metadata)) {
    const g = metadata[PROJECTS_TAB_GROUP_ID_KEY];
    if (typeof g === "string" && g.trim()) {
      const id = g.trim();
      if (BUILT_IN_TAB_GROUP_IDS.has(id)) return id;
      const fromLegacy =
        LEGACY_CHILD_DELIVERY_SLUG_MAP[id] ??
        LEGACY_CHILD_DELIVERY_SLUG_MAP[id.toLowerCase()];
      if (fromLegacy) return fromLegacy;
      if (validCustomIds.has(id)) return id;
    }
  }
  return resolveChildDeliveryGroup(metadata, planStage);
}

export function customStatusPresentation(row: CustomProjectStatusRow): {
  label: string;
  labelUpper: string;
  color: string;
  foreground: string;
} {
  const color = normalizeHexColor(row.color) || row.color;
  return {
    label: row.label,
    labelUpper: row.label.toUpperCase(),
    color,
    foreground: contrastTextForBg(color),
  };
}

export function isBuiltInTabGroupId(id: string): id is ChildDeliveryStatus {
  return BUILT_IN_TAB_GROUP_IDS.has(id);
}
