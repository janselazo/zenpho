import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchGooglePlacePhotoMedia } from "@/lib/crm/places-photo-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAFE_PLACE_PHOTO_REF = /^places\/[^\s]+\/photos\/[^\s]+$/;

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "agency_admin" && profile?.role !== "agency_member") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let photo: string;
  try {
    const u = new URL(req.url);
    photo = (u.searchParams.get("photo") ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!SAFE_PLACE_PHOTO_REF.test(photo)) {
    return NextResponse.json({ error: "Invalid photo reference." }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Places API key is not configured on the server." },
      { status: 503 }
    );
  }

  const buf = await fetchGooglePlacePhotoMedia(apiKey, photo, {
    maxPx: 960,
  });
  if (!buf?.byteLength) {
    return NextResponse.json({ error: "Photo not available." }, { status: 404 });
  }

  return new NextResponse(Buffer.from(buf), {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
