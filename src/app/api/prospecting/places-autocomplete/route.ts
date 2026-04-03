import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_INPUT = 200;
const AUTOCOMPLETE_FIELD_MASK =
  "suggestions.placePrediction.placeId,suggestions.placePrediction.text";

type AutocompleteBody = {
  input?: string;
  /** Appended to input for softer geographic bias (e.g. city or region). */
  cityHint?: string;
};

type GoogTextObj = { text?: string };
type GoogPlacePrediction = {
  placeId?: string;
  text?: GoogTextObj;
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized", suggestions: [] }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "agency_admin" && profile?.role !== "agency_member") {
    return NextResponse.json({ error: "Forbidden", suggestions: [] }, { status: 403 });
  }

  let body: AutocompleteBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", suggestions: [] }, { status: 400 });
  }

  const raw = String(body.input ?? "").trim();
  const hint = String(body.cityHint ?? "").trim();
  const combined = [raw, hint].filter(Boolean).join(" ").trim();

  if (combined.length < 2) {
    return NextResponse.json({
      suggestions: [] as { placeId: string; description: string }[],
    });
  }

  const input =
    combined.length > MAX_INPUT ? combined.slice(0, MAX_INPUT) : combined;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      suggestions: [] as { placeId: string; description: string }[],
      warning:
        "Set GOOGLE_PLACES_API_KEY in .env.local (Places API enabled) for business autocomplete.",
    });
  }

  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": AUTOCOMPLETE_FIELD_MASK,
    },
    body: JSON.stringify({
      input,
      languageCode: "en",
      regionCode: "us",
      includedRegionCodes: ["us"],
      includePureServiceAreaBusinesses: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({
      suggestions: [] as { placeId: string; description: string }[],
      warning: `Places Autocomplete error (${res.status}).`,
      detail: text.slice(0, 200),
    });
  }

  const data = (await res.json()) as {
    suggestions?: { placePrediction?: GoogPlacePrediction }[];
  };

  const suggestions: { placeId: string; description: string }[] = [];
  for (const s of data.suggestions ?? []) {
    const pred = s.placePrediction;
    const placeId = pred?.placeId?.trim();
    const description = pred?.text?.text?.trim();
    if (placeId && description) {
      suggestions.push({ placeId, description });
    }
  }

  return NextResponse.json({ suggestions });
}
