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
    const json = (await res.json()) as {
      data?: { screenshot?: { url?: string } };
    };
    return json?.data?.screenshot?.url?.trim() || null;
  } catch {
    return null;
  }
}
