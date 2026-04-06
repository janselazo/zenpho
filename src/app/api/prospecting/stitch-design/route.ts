import { NextResponse } from "next/server";
import { runStitchProspectDesign } from "@/lib/crm/stitch-prospect-design-run";
import type { StitchProspectDesignPayload } from "@/lib/crm/stitch-prospect-design-types";

/** Stitch generation can take several minutes; plan limits may clamp lower on Hobby. */
export const maxDuration = 300;

export const runtime = "nodejs";

function isValidStitchPayload(body: unknown): body is StitchProspectDesignPayload {
  if (!body || typeof body !== "object") return false;
  const o = body as Record<string, unknown>;
  if (o.target !== "website" && o.target !== "mobile") return false;
  if (o.kind === "place") {
    const p = o.place;
    if (!p || typeof p !== "object") return false;
    const pl = p as Record<string, unknown>;
    return typeof pl.id === "string" && typeof pl.name === "string";
  }
  if (o.kind === "url") {
    return typeof o.url === "string" && o.url.trim().length > 0;
  }
  return false;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false as const, error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isValidStitchPayload(body)) {
    return NextResponse.json(
      { ok: false as const, error: "Invalid Stitch payload (need target, kind, place|url)." },
      { status: 400 }
    );
  }

  try {
    const result = await runStitchProspectDesign(body);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[stitch-design] route", e);
    const msg = e instanceof Error ? e.message : "Stitch design failed unexpectedly.";
    return NextResponse.json({ ok: false as const, error: msg });
  }
}
