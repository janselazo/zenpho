import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || null;
  return NextResponse.json({
    ok: true,
    googleMapsApiKey: key,
  });
}
