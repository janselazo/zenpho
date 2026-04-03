import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";
import {
  normalizePlacesApiPlace,
  PLACES_TEXT_SEARCH_FIELD_MASK,
  type GoogPlaceJson,
} from "@/lib/crm/places-google-shared";

const MAX_QUERY_LEN = 280;

function placeHasWebsite(p: PlacesSearchPlace): boolean {
  return Boolean(p.websiteUri?.trim());
}

/** No-website listings first (stable within each group). */
function sortPlacesNoWebsiteFirst(places: PlacesSearchPlace[]): PlacesSearchPlace[] {
  return [...places].sort((a, b) => {
    const wa = placeHasWebsite(a);
    const wb = placeHasWebsite(b);
    if (wa === wb) return 0;
    return wa ? 1 : -1;
  });
}

type SearchBody = {
  textQuery?: string;
  /** Optional: narrows Text Search to a specific business name (combined with category when both set). */
  businessName?: string;
  category?: string;
  city?: string;
};

function resolveTextQuery(body: SearchBody): { ok: true; textQuery: string } | { ok: false; error: string } {
  const legacy = String(body.textQuery ?? "").trim();
  const businessName = String(body.businessName ?? "").trim();
  const category = String(body.category ?? "").trim();
  const city = String(body.city ?? "").trim();

  const usesStructured = Boolean(businessName || category || city);

  if (usesStructured) {
    if (!category && !businessName) {
      return { ok: false, error: "Enter a business category and/or business name." };
    }
    const subject = [businessName, category].filter(Boolean).join(" ").trim();
    let textQuery = city ? `${subject} in ${city}`.trim() : subject;
    if (textQuery.length > MAX_QUERY_LEN) {
      textQuery = textQuery.slice(0, MAX_QUERY_LEN);
    }
    if (!textQuery) {
      return { ok: false, error: "Enter a business category and/or business name." };
    }
    return { ok: true, textQuery };
  }

  if (legacy) {
    if (legacy.length > MAX_QUERY_LEN) {
      return {
        ok: false,
        error: `Enter a search between 1 and ${MAX_QUERY_LEN} characters.`,
      };
    }
    return { ok: true, textQuery: legacy };
  }

  return {
    ok: false,
    error: "Enter a business category and/or name to search (city is optional).",
  };
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized", places: [] }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "agency_admin" && profile?.role !== "agency_member") {
    return NextResponse.json({ error: "Forbidden", places: [] }, { status: 403 });
  }

  let body: SearchBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", places: [] }, { status: 400 });
  }

  const resolved = resolveTextQuery(body);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error, places: [] }, { status: 400 });
  }
  const textQuery = resolved.textQuery;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      places: [] as PlacesSearchPlace[],
      warning:
        "Set GOOGLE_PLACES_API_KEY in .env.local (Places API enabled) to search businesses.",
    });
  }

  const requestPayload: Record<string, unknown> = {
    textQuery,
    languageCode: "en",
    includePureServiceAreaBusinesses: true,
  };
  if (!String(body.city ?? "").trim()) {
    requestPayload.regionCode = "US";
  }

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": PLACES_TEXT_SEARCH_FIELD_MASK,
    },
    body: JSON.stringify(requestPayload),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({
      places: [] as PlacesSearchPlace[],
      warning: `Places API error (${res.status}). Check billing and API enablement.`,
      detail: text.slice(0, 200),
    });
  }

  const data = (await res.json()) as { places?: GoogPlaceJson[] };
  let places = (data.places ?? [])
    .map(normalizePlacesApiPlace)
    .filter((x): x is PlacesSearchPlace => x !== null);

  places = sortPlacesNoWebsiteFirst(places);

  return NextResponse.json({
    places,
  });
}
