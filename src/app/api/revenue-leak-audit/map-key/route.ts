import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENV_NAMES = [
  "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
  "GOOGLE_MAPS_API_KEY",
  "GOOGLE_MAPS_BROWSER_API_KEY",
  "MAPS_API_KEY",
] as const;

export async function GET() {
  let foundIn: string | null = null;
  let key: string | null = null;
  for (const name of ENV_NAMES) {
    const value = process.env[name]?.trim();
    if (value) {
      foundIn = name;
      key = value;
      break;
    }
  }

  return NextResponse.json({
    ok: true,
    googleMapsApiKey: key,
    foundInEnv: foundIn,
  });
}
