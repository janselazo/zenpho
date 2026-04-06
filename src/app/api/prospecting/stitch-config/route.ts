import { NextResponse } from "next/server";
import { requireAgencyStaff } from "@/app/(crm)/actions/prospect-preview-agency";

export const runtime = "nodejs";

/**
 * Whether the server has STITCH_API_KEY (without exposing the key).
 * Used by prospecting UI to show MCP vs server env guidance and manual copy-prompt flow.
 */
export async function GET() {
  const auth = await requireAgencyStaff();
  if (auth.error || !auth.user) {
    return NextResponse.json({ ok: false as const, error: auth.error ?? "Unauthorized" }, { status: 401 });
  }
  const stitchApiKeyConfigured = Boolean(process.env.STITCH_API_KEY?.trim());
  return NextResponse.json({ ok: true as const, stitchApiKeyConfigured });
}
