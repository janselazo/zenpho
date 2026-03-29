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
  { slug: "new", label: "New Lead", color: "#64748b" },
  { slug: "contacted", label: "Contacted", color: "#3b82f6" },
  { slug: "discoverycall_scheduled", label: "DiscoveryCall Scheduled", color: "#06b6d4" },
  { slug: "discoverycall_completed", label: "DiscoveryCall Completed", color: "#8b5cf6" },
  { slug: "proposal_sent", label: "Proposal Sent", color: "#a855f7" },
  { slug: "negotiation", label: "Negotiation", color: "#f59e0b" },
  { slug: "closed_won", label: "Closed Won", color: "#10b981" },
  { slug: "closed_lost", label: "Closed Lost", color: "#ef4444" },
  { slug: "nurture", label: "Nurture", color: "#94a3b8" },
];

const SLUG_RE = /^[a-z][a-z0-9_]{0,63}$/;

function isValidColor(c: string): boolean {
  const s = c.trim();
  if (!s.startsWith("#")) return false;
  const hex = s.slice(1);
  return (
    (hex.length === 3 || hex.length === 6) && /^[0-9a-fA-F]+$/.test(hex)
  );
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
    if (!SLUG_RE.test(slug) || !label || !isValidColor(color)) return null;
    if (seen.has(slug)) return null;
    seen.add(slug);
    out.push({ slug, label, color });
  }
  return out.length > 0 ? out : null;
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

/** Default new leads use stage `new`. */
export function ensureLeadPipelineRequiredSlugs(
  cols: PipelineColumnDef[]
): PipelineColumnDef[] {
  if (cols.some((c) => c.slug === "new")) return cols;
  const n = DEFAULT_LEAD_PIPELINE_COLUMNS.find((c) => c.slug === "new");
  return n ? [{ ...n }, ...cols] : cols;
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
  const legacy = DEFAULT_LEAD_PIPELINE_COLUMNS.find((c) => c.slug === stage);
  if (legacy) return { label: legacy.label, color: legacy.color };
  return {
    label: stage.replace(/_/g, " ").replace(/\bs_/g, "") || "Stage",
    color: "#64748b",
  };
}

/** Map legacy / unknown lead stages onto a configured slug for Kanban grouping. */
export function normalizeLeadStageForPipeline(
  raw: string | null | undefined,
  pipeline: PipelineColumnDef[]
): string {
  const t = (raw ?? "new").trim();
  const s = t.toLowerCase();
  if (s === "won") {
    const cw = pipeline.find((c) => c.slug === "closed_won");
    if (cw) return cw.slug;
    const q = pipeline.find((c) => c.slug === "qualified");
    return q?.slug ?? pipeline[0]?.slug ?? "new";
  }
  if (s === "lost") {
    const cl = pipeline.find((c) => c.slug === "closed_lost");
    if (cl) return cl.slug;
    const nq = pipeline.find((c) => c.slug === "not_qualified");
    return nq?.slug ?? pipeline[0]?.slug ?? "new";
  }
  if (s === "qualified") {
    const exact = pipeline.find((c) => c.slug.toLowerCase() === "qualified");
    if (exact) return exact.slug;
    const dcc = pipeline.find((c) => c.slug === "discoverycall_completed");
    if (dcc) return dcc.slug;
    return pipeline[0]?.slug ?? "new";
  }
  if (s === "not_qualified") {
    const exact = pipeline.find((c) => c.slug.toLowerCase() === "not_qualified");
    if (exact) return exact.slug;
    const cl = pipeline.find((c) => c.slug === "closed_lost");
    if (cl) return cl.slug;
    const nur = pipeline.find((c) => c.slug === "nurture");
    if (nur) return nur.slug;
    return pipeline[0]?.slug ?? "new";
  }
  const hit = pipeline.find((c) => c.slug.toLowerCase() === s);
  if (hit) return hit.slug;
  return t || (pipeline[0]?.slug ?? "new");
}
