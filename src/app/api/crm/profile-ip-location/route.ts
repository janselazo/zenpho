import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveApproximateLocation } from "@/lib/crm/resolve-request-location";

/**
 * GET: current user’s stored `profiles.ip_location` (no IP lookup).
 * POST: resolve location from this request’s IP, store on profile, return it.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: row } = await supabase
    .from("profiles")
    .select("ip_location")
    .eq("id", user.id)
    .maybeSingle();
  return NextResponse.json({
    ipLocation: (row?.ip_location as string | null) ?? null,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const label = await resolveApproximateLocation(request);
  if (!label) {
    const { data: row } = await supabase
      .from("profiles")
      .select("ip_location")
      .eq("id", user.id)
      .maybeSingle();
    return NextResponse.json({
      ipLocation: (row?.ip_location as string | null) ?? null,
      updated: false,
    });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ ip_location: label })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ipLocation: label, updated: true });
}
