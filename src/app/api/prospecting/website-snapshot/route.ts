import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeUrlForFetch } from "@/lib/crm/safe-url-fetch";
import { fetchMicrolinkScreenshotUrl } from "@/lib/crm/microlink-screenshot";

/**
 * Proxies a Microlink screenshot of a public URL for CRM “website scan” thumbnails.
 * Requires agency staff session (same as other /api/prospecting routes).
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
  const raw = searchParams.get("url");
  const normalized = raw ? normalizeUrlForFetch(raw) : null;
  if (!normalized) {
    return NextResponse.json({ error: "Invalid or blocked URL" }, { status: 400 });
  }

  const fetchRemoteImage = async (remoteUrl: string): Promise<Response | null> => {
    try {
      const imgRes = await fetch(remoteUrl, { signal: AbortSignal.timeout(45_000) });
      return imgRes.ok ? imgRes : null;
    } catch {
      return null;
    }
  };

  let remote = await fetchMicrolinkScreenshotUrl(normalized);
  let imgRes = remote ? await fetchRemoteImage(remote) : null;

  if (!imgRes) {
    await new Promise((r) => setTimeout(r, 500));
    remote = (await fetchMicrolinkScreenshotUrl(normalized)) ?? remote;
    imgRes = remote ? await fetchRemoteImage(remote) : null;
  }

  if (!imgRes) {
    return NextResponse.json(
      {
        error:
          "Screenshot unavailable (Microlink). Set MICROLINK_API_KEY for higher success rates, or MICROLINK_SCREENSHOT_DELAY_MS if pages need more time to render.",
      },
      { status: 502 },
    );
  }

  const buf = await imgRes.arrayBuffer();
  const ct = imgRes.headers.get("content-type") || "image/png";

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": ct,
      "Cache-Control": "private, max-age=300",
    },
  });
}
