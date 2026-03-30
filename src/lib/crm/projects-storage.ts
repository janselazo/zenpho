import type { MockProject } from "@/lib/crm/mock-data";
import { projects as seedProjects } from "@/lib/crm/mock-data";
import { parsePlanStage } from "@/lib/crm/map-project-row";

export const CRM_PROJECTS_STORAGE_KEY = "crm_projects_v1";

/** After Supabase project CRUD from other surfaces, `/projects` listens and refetches. */
export const CRM_SUPABASE_PROJECTS_CHANGED_EVENT = "crm-supabase-projects-changed";

/** Ensures `clientId` exists for JSON rows saved before client linkage. */
export function normalizeStoredProject(row: MockProject): MockProject {
  const clientId =
    typeof row.clientId === "string" && row.clientId.trim() !== ""
      ? row.clientId.trim()
      : "";
  return {
    ...row,
    clientId,
    clientName: row.clientName ?? null,
    plan: parsePlanStage(
      typeof row.plan === "string" ? row.plan : null
    ),
  };
}

function dedupeProjectsById(list: MockProject[]): MockProject[] {
  const byId = new Map<string, MockProject>();
  for (const p of list) byId.set(p.id, p);
  return Array.from(byId.values());
}

/** Stable unique id (avoids `Date.now()` collisions on double-submit). */
export function createProjectId(): string {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return `proj-${globalThis.crypto.randomUUID()}`;
  }
  return `proj-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function readStoredProjects(): MockProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CRM_PROJECTS_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return dedupeProjectsById(
      (data as MockProject[]).map((p) => normalizeStoredProject(p))
    );
  } catch {
    return [];
  }
}

export function writeStoredProjects(list: MockProject[]) {
  if (typeof window === "undefined") return;
  try {
    const deduped = dedupeProjectsById(list);
    localStorage.setItem(CRM_PROJECTS_STORAGE_KEY, JSON.stringify(deduped));
    window.dispatchEvent(new Event("crm-projects-changed"));
  } catch {
    /* quota / private mode */
  }
}

/** Resolve a project from browser storage first, then seed data. */
export function getMergedProjectById(id: string): MockProject | undefined {
  const fromStored = readStoredProjects().find((p) => p.id === id);
  if (fromStored) return fromStored;
  const fromSeed = seedProjects.find((p) => p.id === id);
  return fromSeed ? normalizeStoredProject(fromSeed) : undefined;
}

/** All projects: seed rows plus stored (stored wins on same id). */
export function getMergedProjectsList(): MockProject[] {
  return dedupeProjectsById([
    ...seedProjects.map((p) => normalizeStoredProject(p)),
    ...readStoredProjects(),
  ]);
}
