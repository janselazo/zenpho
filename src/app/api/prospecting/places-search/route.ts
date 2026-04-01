import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";

type GoogPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  types?: string[];
};

const MAX_QUERY_LEN = 280;

function normalizePlace(p: GoogPlace): PlacesSearchPlace | null {
  const id = p.id ?? "";
  const name = p.displayName?.text?.trim() ?? "";
  if (!id || !name) return null;
  return {
    id,
    name,
    formattedAddress: p.formattedAddress ?? null,
    rating: typeof p.rating === "number" ? p.rating : null,
    userRatingCount:
      typeof p.userRatingCount === "number" ? p.userRatingCount : null,
    websiteUri: p.websiteUri ?? null,
    types: Array.isArray(p.types) ? p.types : [],
  };
}

function looksLikeUsZip(s: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(s.trim());
}

type SearchBody = {
  textQuery?: string;
  category?: string;
  city?: string;
  zip?: string;
  onlyNoWebsite?: boolean;
};

function resolveTextQuery(body: SearchBody): { ok: true; textQuery: string } | { ok: false; error: string } {
  const legacy = String(body.textQuery ?? "").trim();
  const category = String(body.category ?? "").trim();
  const city = String(body.city ?? "").trim();
  const zip = String(body.zip ?? "").trim();

  const usesStructured = Boolean(category || city || zip);

  if (usesStructured) {
    if (!category) {
      return { ok: false, error: "Enter a business category." };
    }
    if (!city && !zip) {
      return { ok: false, error: "Enter a city or ZIP code (or both)." };
    }
    const location = [city, zip].filter(Boolean).join(" ");
    let textQuery = `${category} in ${location}`.trim();
    if (textQuery.length > MAX_QUERY_LEN) {
      textQuery = textQuery.slice(0, MAX_QUERY_LEN);
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
    error: "Enter a business category and city or ZIP to search.",
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

  const onlyNoWebsite = Boolean(body.onlyNoWebsite);
  const zipTrimmed = String(body.zip ?? "").trim();

  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      places: [] as PlacesSearchPlace[],
      warning:
        "Set GOOGLE_PLACES_API_KEY in .env.local (Places API enabled) to search businesses.",
    });
  }

  const fieldMask =
    "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.websiteUri,places.types";

  const requestPayload: Record<string, unknown> = {
    textQuery,
    languageCode: "en",
  };
  if (looksLikeUsZip(zipTrimmed)) {
    requestPayload.regionCode = "US";
  }

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
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

  const data = (await res.json()) as { places?: GoogPlace[] };
  let places = (data.places ?? [])
    .map(normalizePlace)
    .filter((x): x is PlacesSearchPlace => x !== null);

  const totalBeforeFilter = places.length;
  if (onlyNoWebsite) {
    places = places.filter((p) => !p.websiteUri?.trim());
  }
  const droppedCount = onlyNoWebsite ? totalBeforeFilter - places.length : 0;

  return NextResponse.json({
    places,
    filteredByNoWebsite: onlyNoWebsite,
    totalBeforeFilter,
    droppedCount,
  });
}
