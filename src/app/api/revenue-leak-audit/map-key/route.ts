import { NextResponse } from "next/server";
import { resolveGoogleMapsKeyFromEnv } from "@/lib/revenue-leak-audit/resolve-google-maps-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { key, foundIn } = resolveGoogleMapsKeyFromEnv();

  return NextResponse.json({
    ok: true,
    googleMapsApiKey: key,
    foundInEnv: foundIn,
  });
}
