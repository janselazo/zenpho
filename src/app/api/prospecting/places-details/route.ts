import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import {
  normalizePlacesApiPlace,
  PLACES_DETAILS_FIELD_MASK,
  type GoogPlaceJson,
} from "@/lib/crm/places-google-shared";

type DetailsBody = {
  placeId?: string;
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized", place: null }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "agency_admin" && profile?.role !== "agency_member") {
    return NextResponse.json({ error: "Forbidden", place: null }, { status: 403 });
  }

  let body: DetailsBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", place: null }, { status: 400 });
  }

  const placeId = String(body.placeId ?? "").trim();
  if (!placeId) {
    return NextResponse.json({ error: "Missing placeId", place: null }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      place: null as PlacesSearchPlace | null,
      warning:
        "Set GOOGLE_PLACES_API_KEY in .env.local (Places API enabled) to load place details.",
    });
  }

  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": PLACES_DETAILS_FIELD_MASK,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({
      place: null as PlacesSearchPlace | null,
      warning: `Place Details error (${res.status}).`,
      detail: text.slice(0, 200),
    });
  }

  const raw = (await res.json()) as GoogPlaceJson;
  const place = normalizePlacesApiPlace(raw);
  if (!place) {
    return NextResponse.json({
      place: null as PlacesSearchPlace | null,
      warning: "Could not normalize place from Google.",
    });
  }

  return NextResponse.json({ place });
}
