/**
 * Resolves a human-readable approximate location from the incoming request
 * (for IP-based roster labels). Server-only — uses geo APIs; do not import in client code.
 */

function isNonPublicLoopback(ip: string): boolean {
  const t = ip.trim();
  if (t === "127.0.0.1" || t === "::1" || t === "0.0.0.0") return true;
  if (t.startsWith("10.")) return true;
  if (t.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(t)) return true;
  return false;
}

export function getClientIp(request: Request): string | null {
  const h = request.headers;
  const chain = h.get("x-forwarded-for");
  if (chain) {
    const first = chain.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  const v = h.get("x-vercel-forwarded-for");
  if (v) {
    const first = v.split(",")[0]?.trim();
    if (first) return first;
  }
  return null;
}

/**
 * Vercel Edge injects these on production (see Vercel request headers docs).
 */
export function locationFromVercelEdgeHeaders(request: Request): string | null {
  const h = request.headers;
  const city = h.get("x-vercel-ip-city")?.trim();
  const countryCode = h.get("x-vercel-ip-country")?.trim();
  const region = h.get("x-vercel-ip-country-region")?.trim();
  if (city && countryCode) {
    if (countryCode === "US" && region && region.length === 2) {
      return `${city}, ${region}, USA`;
    }
    return `${city}, ${countryCode}`;
  }
  if (city) return city;
  return null;
}

type IpWhoResponse = {
  success?: boolean;
  city?: string;
  region?: string;
  country?: string;
};

async function fetchIpWhoLocation(ip: string): Promise<string | null> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 5000);
  try {
    const res = await fetch(
      `https://ipwho.is/${encodeURIComponent(ip)}`,
      {
        signal: ac.signal,
        headers: { Accept: "application/json" },
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as IpWhoResponse;
    if (!data.success) return null;
    const parts = [data.city, data.region, data.country].filter(
      (p): p is string => Boolean(p?.trim())
    );
    if (parts.length === 0) return null;
    return parts.join(", ");
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Best-effort label for the request’s client IP, then Vercel edge metadata.
 * Local/private IPs skip external lookup and fall back to edge headers only.
 */
export async function resolveApproximateLocation(
  request: Request
): Promise<string | null> {
  const ip = getClientIp(request);
  if (ip && !isNonPublicLoopback(ip)) {
    const fromApi = await fetchIpWhoLocation(ip);
    if (fromApi) return fromApi;
  }
  return locationFromVercelEdgeHeaders(request);
}
