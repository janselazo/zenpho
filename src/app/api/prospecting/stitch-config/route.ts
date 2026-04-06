import { NextResponse } from "next/server";
import { requireAgencyStaff } from "@/app/(crm)/actions/prospect-preview-agency";
import { isStitchServerApiKeyConfigured } from "@/lib/crm/stitch-server-key";

export const runtime = "nodejs";

/**
 * Whether the server has a Stitch API key (STITCH_API_KEY or GOOGLE_STITCH_API_KEY), without exposing it.
 */
export async function GET() {
  const auth = await requireAgencyStaff();
  if (auth.error || !auth.user) {
    return NextResponse.json({ ok: false as const, error: auth.error ?? "Unauthorized" }, { status: 401 });
  }
  const stitchApiKeyConfigured = isStitchServerApiKeyConfigured();
  return NextResponse.json({ ok: true as const, stitchApiKeyConfigured });
}
