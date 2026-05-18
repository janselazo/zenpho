import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Proxies a remote image URL for CRM outreach attachments (e.g. Higgsfield CDN thumbnails).
 * Avoids browser CORS when building email/SMS attachment blobs.
 */
export async function GET(request: Request) {
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

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("url")?.trim();
  if (!raw) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Invalid url scheme" }, { status: 400 });
  }

  try {
    const imgRes = await fetch(parsed.toString(), {
      signal: AbortSignal.timeout(45_000),
      headers: {
        accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });
    if (!imgRes.ok) {
      return NextResponse.json(
        { error: `Image fetch failed (${imgRes.status})` },
        { status: 502 },
      );
    }
    const ct = imgRes.headers.get("content-type") || "image/png";
    if (!ct.startsWith("image/")) {
      return NextResponse.json({ error: "Remote response is not an image" }, { status: 502 });
    }
    const buf = await imgRes.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": ct,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Image fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
