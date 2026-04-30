import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name")?.trim();
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();

  if (!name || !/^places\/[^/]+\/photos\/[^/]+$/i.test(name)) {
    return NextResponse.json({ error: "Invalid photo name." }, { status: 400 });
  }

  if (!apiKey) {
    return NextResponse.json({ error: "Google Places API key is missing." }, { status: 404 });
  }

  const url = `https://places.googleapis.com/v1/${encodeURI(
    name
  )}/media?maxWidthPx=480&key=${encodeURIComponent(apiKey)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return NextResponse.json({ error: "Photo unavailable." }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: "Photo unavailable." }, { status: res.status });
  }

  const buf = await res.arrayBuffer();
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
