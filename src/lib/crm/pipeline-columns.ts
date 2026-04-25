/**
 * Configurable CRM pipeline columns (Leads + Deals Kanban).
 * Slugs are stored on `lead.stage` / `deal.stage`; labels & colors are UI config.
 */

export type PipelineColumnDef = {
  slug: string;
  label: string;
  color: string;
};

export const DEFAULT_DEAL_PIPELINE_COLUMNS: PipelineColumnDef[] = [
  { slug: "prospect", label: "Open", color: "#6b7280" },
  { slug: "proposal", label: "Proposal", color: "#3b82f6" },
  { slug: "negotiation", label: "Negotiation", color: "#f59e0b" },
  { slug: "closed_won", label: "Won", color: "#10b981" },
  { slug: "closed_lost", label: "Lost", color: "#ef4444" },
];

export const DEFAULT_LEAD_PIPELINE_COLUMNS: PipelineColumnDef[] = [
  { slug: "contacted", label: "Contacted", color: "#3b82f6" },
  { slug: "discoverycall_scheduled", label: "Appointment Scheduled", color: "#06b6d4" },
  { slug: "discoverycall_completed", label: "Appointment Completed", color: "#8b5cf6" },
  { slug: "proposal_sent", label: "Proposal Sent", color: "#92400e" },
  { slug: "negotiation", label: "Negotiation", color: "#f59e0b" },
  { slug: "nurture", label: "Nurture", color: "#94a3b8" },
  { slug: "closed_won", label: "Won", color: "#10b981" },
  { slug: "closed_lost", label: "Lost", color: "#ef4444" },
];

const SLUG_RE = /^[a-z][a-z0-9_]{0,63}$/;

/** Normalize #RGB / #RRGGBB to lowercase #rrggbb; invalid → null. */
export function normalizePipelineHexColor(c: string): string | null {
  const s = c.trim();
  if (!s.startsWith("#")) return null;
  const hex = s.slice(1);
  if (!/^[0-9a-fA-F]+$/.test(hex)) return null;
  if (hex.length === 3) {
    return `#${hex
      .split("")
      .map((ch) => ch + ch)
      .join("")
      .toLowerCase()}`;
  }
  if (hex.length === 6) return `#${hex.toLowerCase()}`;
  return null;
}

/** Parse DB jsonb; invalid → null. */
export function parsePipelineColumnArray(raw: unknown): PipelineColumnDef[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: PipelineColumnDef[] = [];
  const seen = new Set<string>();
  for (const row of raw) {
    if (!row || typeof row !== "object") return null;
    const o = row as Record<string, unknown>;
    const slug = String(o.slug ?? "").trim();
    const label = String(o.label ?? "").trim();
    const color = String(o.color ?? "").trim();
    const norm = normalizePipelineHexColor(color);
    if (!SLUG_RE.test(slug) || !label || !norm) return null;
    if (seen.has(slug)) return null;
    seen.add(slug);
    out.push({ slug, label, color: norm });
  }
  return out.length > 0 ? out : null;
}

/**
 * Validate pipeline payload from the client before save (clear errors for debugging).
 */
export function validatePipelineColumnArrayForSave(raw: unknown):
  | { ok: PipelineColumnDef[] }
  | { error: string } {
  if (!Array.isArray(raw)) {
    return { error: "Invalid pipeline data." };
  }
  if (raw.length === 0 || raw.length > 20) {
    return { error: "Pipeline must have 1–20 stages." };
  }
  const out: PipelineColumnDef[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!row || typeof row !== "object") {
      return { error: `Stage ${i + 1}: missing or invalid data.` };
    }
    const o = row as Record<string, unknown>;
    const slug = String(o.slug ?? "").trim();
    const label = String(o.label ?? "").trim();
    const norm = normalizePipelineHexColor(String(o.color ?? "").trim());
    if (!slug) {
      return { error: `Stage ${i + 1}: each stage needs a slug.` };
    }
    if (!SLUG_RE.test(slug)) {
      return {
        error: `Stage “${label || slug}”: slug “${slug}” is invalid. Use lowercase letters, numbers, and underscores only.`,
      };
    }
    if (!label) {
      return { error: `Stage “${slug}”: label cannot be empty.` };
    }
    if (!norm) {
      return {
        error: `Stage “${label}”: color must be a hex value like #RGB or #RRGGBB.`,
      };
    }
    if (seen.has(slug)) {
      return { error: `Duplicate stage slug “${slug}”.` };
    }
    seen.add(slug);
    out.push({ slug, label, color: norm });
  }
  return { ok: out };
}

export function mergeDealPipelineFromDb(raw: unknown): PipelineColumnDef[] {
  const parsed = parsePipelineColumnArray(raw);
  return parsed ?? DEFAULT_DEAL_PIPELINE_COLUMNS;
}

export function mergeLeadPipelineFromDb(raw: unknown): PipelineColumnDef[] {
  const parsed = parsePipelineColumnArray(raw);
  return parsed ?? DEFAULT_LEAD_PIPELINE_COLUMNS;
}

/** Keep outcome stages so client conversion + reporting stay consistent. */
export function ensureDealPipelineRequiredSlugs(
  cols: PipelineColumnDef[]
): PipelineColumnDef[] {
  const bySlug = new Map(cols.map((c) => [c.slug, c]));
  const out = [...cols];
  for (const req of ["prospect", "closed_won", "closed_lost"] as const) {
    if (!bySlug.has(req)) {
      const d = DEFAULT_DEAL_PIPELINE_COLUMNS.find((c) => c.slug === req);
      if (d) out.push({ ...d });
    }
  }
  return out;
}

/** Lead pipeline saves as provided (no forced first column). */
export function ensureLeadPipelineRequiredSlugs(
  cols: PipelineColumnDef[]
): PipelineColumnDef[] {
  return cols;
}

export function newPipelineColumnSlug(): string {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `s_${id}`;
}

export function dealStageLabelColor(
  stage: string,
  pipeline: PipelineColumnDef[]
): { label: string; color: string } {
  const hit = pipeline.find((c) => c.slug === stage);
  if (hit) return { label: hit.label, color: hit.color };
  const legacy = DEFAULT_DEAL_PIPELINE_COLUMNS.find((c) => c.slug === stage);
  if (legacy) return { label: legacy.label, color: legacy.color };
  return {
    label: stage.replace(/_/g, " ").replace(/\bs_/g, "") || "Stage",
    color: "#64748b",
  };
}

export function leadStageLabelColor(
  stage: string,
  pipeline: PipelineColumnDef[]
): { label: string; color: string } {
  const hit = pipeline.find((c) => c.slug === stage);
  if (hit) return { label: hit.label, color: hit.color };
  if (stage.toLowerCase() === "new") {
    return { label: "New Lead", color: "#ea580c" };
  }
  const legacy = DEFAULT_LEAD_PIPELINE_COLUMNS.find((c) => c.slug === stage);
  if (legacy) return { label: legacy.label, color: legacy.color };
  return {
    label: stage.replace(/_/g, " ").replace(/\bs_/g, "") || "Stage",
    color: "#64748b",
  };
}

/** Map legacy / unknown lead stages onto a configured slug for Kanban grouping. */
/** True when `stageSlug` is the pipeline's Lost outcome column (default `closed_lost`, or any column labeled "Lost"). */
export function isLeadLostStage(
  stageSlug: string,
  pipeline: PipelineColumnDef[]
): boolean {
  const s = stageSlug.trim();
  if (!s) return false;
  if (s === "closed_lost") return true;
  const col = pipeline.find((c) => c.slug === s);
  if (!col) return false;
  return col.label.trim().toLowerCase() === "lost";
}

export function normalizeLeadStageForPipeline(
  raw: string | null | undefined,
  pipeline: PipelineColumnDef[]
): string {
  const t = (raw ?? "contacted").trim();
  const s = t.toLowerCase();
  if (s === "won") {
    const cw = pipeline.find((c) => c.slug === "closed_won");
    if (cw) return cw.slug;
    const q = pipeline.find((c) => c.slug === "qualified");
    return q?.slug ?? pipeline[0]?.slug ?? "contacted";
  }
  if (s === "lost") {
    const cl = pipeline.find((c) => c.slug === "closed_lost");
    if (cl) return cl.slug;
    const nq = pipeline.find((c) => c.slug === "not_qualified");
    return nq?.slug ?? pipeline[0]?.slug ?? "contacted";
  }
  if (s === "qualified") {
    const exact = pipeline.find((c) => c.slug.toLowerCase() === "qualified");
    if (exact) return exact.slug;
    const dcc = pipeline.find((c) => c.slug === "discoverycall_completed");
    if (dcc) return dcc.slug;
    return pipeline[0]?.slug ?? "contacted";
  }
  if (s === "not_qualified") {
    const exact = pipeline.find((c) => c.slug.toLowerCase() === "not_qualified");
    if (exact) return exact.slug;
    const cl = pipeline.find((c) => c.slug === "closed_lost");
    if (cl) return cl.slug;
    const nur = pipeline.find((c) => c.slug === "nurture");
    if (nur) return nur.slug;
    return pipeline[0]?.slug ?? "contacted";
  }
  if (s === "new") {
    const contacted = pipeline.find((c) => c.slug === "contacted");
    if (contacted) return contacted.slug;
    const newCol = pipeline.find((c) => c.slug === "new");
    if (newCol) return newCol.slug;
    return pipeline[0]?.slug ?? "contacted";
  }
  const hit = pipeline.find((c) => c.slug.toLowerCase() === s);
  if (hit) return hit.slug;
  return t || (pipeline[0]?.slug ?? "contacted");
}
