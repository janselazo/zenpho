import type { MetaPixelResult } from "@/lib/crm/meta-ad-intel-types";

const PIXEL_MARKERS = [
  "fbq('init'",
  'fbq("init"',
  "connect.facebook.net/en_US/fbevents.js",
  "connect.facebook.net/en_us/fbevents.js",
  "facebook-pixel",
  "_fbq",
] as const;

function unique(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

export function detectMetaPixel(html: string): MetaPixelResult {
  const lower = html.toLowerCase();
  const markerDetected = PIXEL_MARKERS.some((marker) =>
    lower.includes(marker.toLowerCase()),
  );

  const pixelIds: string[] = [];
  for (const match of html.matchAll(/fbq\(\s*['"]init['"]\s*,\s*['"](\d{5,})['"]/gi)) {
    pixelIds.push(match[1]);
  }
  for (const match of html.matchAll(/facebook\.com\/tr\?id=(\d{5,})/gi)) {
    pixelIds.push(match[1]);
  }

  const ids = unique(pixelIds);
  return {
    detected: markerDetected || ids.length > 0,
    pixelIds: ids,
  };
}
