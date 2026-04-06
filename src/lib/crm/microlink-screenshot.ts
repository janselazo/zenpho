/**
 * Microlink screenshot URL for a public page (used by prospect preview + website snapshot API).
 */

export async function fetchMicrolinkScreenshotUrl(
  pageUrl: string,
  timeoutMs = 60_000
): Promise<string | null> {
  const apiKey = process.env.MICROLINK_API_KEY?.trim();
  const micBase = apiKey ? "https://pro.microlink.io" : "https://api.microlink.io";
  const micUrl = `${micBase}/?url=${encodeURIComponent(pageUrl)}&screenshot=true&meta=false`;

  const headers: HeadersInit = {};
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }

  try {
    const res = await fetch(micUrl, { headers, signal: AbortSignal.timeout(timeoutMs) });
    const text = await res.text();
    if (!res.ok) {
      console.warn(
        "[microlink] screenshot request failed",
        res.status,
        text.slice(0, 300),
      );
      return null;
    }
    let json: { data?: { screenshot?: { url?: string } }; message?: string };
    try {
      json = JSON.parse(text) as typeof json;
    } catch {
      console.warn("[microlink] screenshot invalid JSON", text.slice(0, 200));
      return null;
    }
    const url = json?.data?.screenshot?.url?.trim();
    if (!url && json?.message) {
      console.warn("[microlink] screenshot", json.message);
    }
    return url || null;
  } catch (e) {
    console.warn("[microlink] screenshot error", e);
    return null;
  }
}
