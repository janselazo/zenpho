import { NextResponse } from "next/server";
import { requireAgencyStaff } from "@/app/(crm)/actions/prospect-preview-agency";
import { buildStitchProspectGenerationBundle } from "@/lib/crm/stitch-prospect-bundle";
import { enrichStitchProspectPayloadWithBrandAssets } from "@/lib/crm/stitch-prospect-enrich";
import { parseStitchDesignPayload } from "@/lib/crm/stitch-prospect-payload";

export const runtime = "nodejs";

/**
 * Returns the same prompt text the Stitch SDK uses, for manual paste into Google Stitch
 * when STITCH_API_KEY is not configured on the server.
 */
export async function POST(request: Request) {
  const auth = await requireAgencyStaff();
  if (auth.error || !auth.user) {
    return NextResponse.json(
      { ok: false as const, error: auth.error ?? "Unauthorized" },
      { status: 401 }
    );
  }

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

  const enrichedPayload = await enrichStitchProspectPayloadWithBrandAssets(
    payload,
    { logPrefix: "[stitch-design-prompt]", timeoutMs: 6000 }
  );
  const bundle = buildStitchProspectGenerationBundle(enrichedPayload);
  return NextResponse.json({
    ok: true as const,
    prompt: bundle.prompt,
    projectTitle: bundle.projectTitle,
    deviceType: bundle.deviceType,
  });
}
