import { NextResponse } from "next/server";
import { getBusinessDetails } from "@/lib/revenue-leak-audit/google-places-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  placeId?: unknown;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON request body.", business: null },
      { status: 400 }
    );
  }

  const placeId = typeof body.placeId === "string" ? body.placeId.trim() : "";
  if (!placeId) {
    return NextResponse.json(
      { ok: false, error: "Missing placeId.", business: null },
      { status: 400 }
    );
  }

  const result = await getBusinessDetails(placeId);
  if (!result.data) {
    return NextResponse.json(
      {
        ok: false,
        error: result.warnings[0] ?? "Business details unavailable.",
        business: null,
        warnings: result.warnings,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    business: result.data,
    warnings: result.warnings,
  });
}
