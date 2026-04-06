import { NextResponse } from "next/server";
import {
  runGenerateProspectPreview,
  type GenerateProspectPreviewPayload,
} from "@/lib/crm/prospect-preview-run-generate";

/** Hobby plan still caps wall-clock; Pro+ allows longer runs for LLM + DB. */
export const maxDuration = 120;

/** LLM + OpenAI SDK expect Node; avoids Edge runtime surprises. */
export const runtime = "nodejs";

function isValidPayload(body: unknown): body is GenerateProspectPreviewPayload {
  if (!body || typeof body !== "object" || !("kind" in body)) return false;
  const o = body as Record<string, unknown>;
  const k = o.kind;
  if (k === "place") {
    const place = o.place;
    return place != null && typeof place === "object";
  }
  if (k === "url") {
    return typeof o.url === "string";
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

  if (!isValidPayload(body)) {
    return NextResponse.json({ ok: false as const, error: "Invalid preview payload." }, { status: 400 });
  }

  try {
    const result = await runGenerateProspectPreview(body);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[generate-preview] route", e);
    const msg = e instanceof Error ? e.message : "Preview generation failed unexpectedly.";
    // Always 200 + JSON so the client can read `error` (platform 500s often omit JSON).
    return NextResponse.json({ ok: false as const, error: msg });
  }
}
