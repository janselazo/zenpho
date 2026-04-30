import { NextResponse } from "next/server";
import { searchBusinesses } from "@/lib/revenue-leak-audit/google-places-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  businessName?: unknown;
  city?: unknown;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON request body.", businesses: [] },
      { status: 400 }
    );
  }

  const businessName =
    typeof body.businessName === "string" ? body.businessName.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  if (businessName.length < 2) {
    return NextResponse.json(
      { ok: false, error: "Enter a business name.", businesses: [] },
      { status: 400 }
    );
  }
  if (businessName.length > 160 || city.length > 100) {
    return NextResponse.json(
      { ok: false, error: "Search is too long.", businesses: [] },
      { status: 400 }
    );
  }

  const result = await searchBusinesses({ businessName, city });
  return NextResponse.json({
    ok: true,
    businesses: result.data,
    warnings: result.warnings,
  });
}
