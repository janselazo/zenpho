import type { StitchProspectDesignPayload } from "@/lib/crm/stitch-prospect-design-types";

export function parseStitchDesignPayload(body: unknown): StitchProspectDesignPayload | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  if (o.target !== "website" && o.target !== "mobile") return null;
  if (o.kind === "place") {
    const p = o.place;
    if (!p || typeof p !== "object") return null;
    const pl = p as Record<string, unknown>;
    if (typeof pl.id !== "string" || typeof pl.name !== "string") return null;
    return o as StitchProspectDesignPayload;
  }
  if (o.kind === "url") {
    if (typeof o.url !== "string" || !o.url.trim()) return null;
    return o as StitchProspectDesignPayload;
  }
  return null;
}
