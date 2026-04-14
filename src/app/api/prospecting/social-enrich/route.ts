import { NextResponse } from "next/server";
import { enrichProspectFromSocialAction } from "@/app/(crm)/actions/prospect-intel";
import type { PlacesSearchPlace } from "@/lib/crm/places-types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { place?: PlacesSearchPlace };
    if (!body.place || typeof body.place !== "object" || !body.place.id || !body.place.name) {
      return NextResponse.json({ ok: false, error: "Missing or invalid place" }, { status: 400 });
    }
    const result = await enrichProspectFromSocialAction(body.place);
    return NextResponse.json(result);
  } catch (err) {
    console.error("social-enrich route error:", err);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
