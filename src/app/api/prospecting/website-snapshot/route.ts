import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeUrlForFetch } from "@/lib/crm/safe-url-fetch";
import { fetchMicrolinkScreenshotUrl } from "@/lib/crm/microlink-screenshot";
import { discoverFallbackImageUrl } from "@/lib/crm/website-snapshot-fallback";

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

  const fetchRemoteImage = async (
    remoteUrl: string,
    timeoutMs = 30_000,
  ): Promise<Response | null> => {
    try {
      const imgRes = await fetch(remoteUrl, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        },
      });
      if (!imgRes.ok) return null;
      const ct = imgRes.headers.get("content-type") || "";
      if (ct && !ct.startsWith("image/")) return null;
      return imgRes;
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

  // Soft fallback: if Microlink can't capture (free-tier limits, anti-bot, render timeout),
  // surface the site's OpenGraph / Twitter card image, or the apple-touch-icon / favicon, so
  // the prospect tile still shows something rather than a "preview unavailable" placeholder.
  if (!imgRes) {
    const fallbackUrl = await discoverFallbackImageUrl(normalized);
    if (fallbackUrl) {
      const fbRes = await fetchRemoteImage(fallbackUrl, 8_000);
      if (fbRes) imgRes = fbRes;
    }
  }

  if (!imgRes) {
    return NextResponse.json(
      {
        error:
          "Screenshot unavailable. The site blocked automated capture and exposed no OpenGraph image — open the site in a new tab to view it.",
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
