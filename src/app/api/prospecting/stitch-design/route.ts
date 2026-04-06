import { NextResponse } from "next/server";
import { runStitchProspectDesign } from "@/lib/crm/stitch-prospect-design-run";
import { parseStitchDesignPayload } from "@/lib/crm/stitch-prospect-payload";

/** Stitch generation can take several minutes; plan limits may clamp lower on Hobby. */
export const maxDuration = 300;

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false as const, error: "Invalid JSON body." }, { status: 400 });
  }

  const payload = parseStitchDesignPayload(body);
  if (!payload) {
    return NextResponse.json(
      { ok: false as const, error: "Invalid Stitch payload (need target, kind, place|url)." },
      { status: 400 }
    );
  }

  try {
    const result = await runStitchProspectDesign(payload);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[stitch-design] route", e);
    const msg = e instanceof Error ? e.message : "Stitch design failed unexpectedly.";
    return NextResponse.json({ ok: false as const, error: msg });
  }
}
