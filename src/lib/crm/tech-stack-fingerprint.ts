/**
 * Lightweight, best-effort website tech-stack fingerprint.
 *
 * Fetches the homepage with SSRF guardrails, reads a slice of HTML + response headers,
 * and classifies the site as no-code (Framer / Webflow / Carrd / Wix / Squarespace /
 * Bubble / Notion) vs self-hosted CMS (WordPress) vs "custom" vs "unknown".
 *
 * Intended for the Tech Startups Fit Score: a no-code landing page is a strong signal
 * that the company may want a custom web app built for them.
 */

import { normalizeUrlForFetch } from "@/lib/crm/safe-url-fetch";

export type StackKind =
  | "framer"
  | "webflow"
  | "carrd"
  | "wix"
  | "squarespace"
  | "bubble"
  | "notion"
  | "wordpress"
  | "custom"
  | "unknown";

export type StackFingerprint = {
  kind: StackKind;
  /** True when `kind` is a no-code / low-code platform suitable for "replace with real app" outreach. */
  isNoCode: boolean;
  /** Short human labels describing why we picked this `kind`. */
  evidence: string[];
  /** Derived from the HTML generator tag when present. */
  generator: string | null;
};

const STACK_LABELS: Record<StackKind, string> = {
  framer: "Framer",
  webflow: "Webflow",
  carrd: "Carrd",
  wix: "Wix",
  squarespace: "Squarespace",
  bubble: "Bubble",
  notion: "Notion",
  wordpress: "WordPress",
  custom: "Custom",
  unknown: "Unknown",
};

const NO_CODE_KINDS: ReadonlySet<StackKind> = new Set([
  "framer",
  "webflow",
  "carrd",
  "wix",
  "squarespace",
  "bubble",
  "notion",
]);

const FETCH_TIMEOUT_MS = 8_000;
const MAX_FETCH_BYTES = 120_000;

export function stackLabel(kind: StackKind): string {
  return STACK_LABELS[kind];
}

export function isNoCodeKind(kind: StackKind): boolean {
  return NO_CODE_KINDS.has(kind);
}

function matchGenerator(html: string): string | null {
  const m =
    html.match(/<meta\s+[^>]*name=["']generator["'][^>]*content=["']([^"']+)["']/i) ??
    html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']generator["']/i);
  return m?.[1]?.trim() ?? null;
}

export function classifyStackFromResponse(
  hostname: string,
  html: string,
  headers: Headers
): StackFingerprint {
  const evidence: string[] = [];
  const host = hostname.toLowerCase();

  const generator = matchGenerator(html);
  if (generator) evidence.push(`generator: ${generator}`);

  const gen = generator?.toLowerCase() ?? "";
  const lowerHtml = html.toLowerCase();
  const poweredBy = (headers.get("x-powered-by") ?? "").toLowerCase();
  const server = (headers.get("server") ?? "").toLowerCase();
  if (poweredBy) evidence.push(`x-powered-by: ${poweredBy}`);
  if (server) evidence.push(`server: ${server}`);

  // Hostname suffixes first — unambiguous.
  if (host.endsWith(".framer.website") || host.endsWith(".framer.ai")) {
    evidence.unshift("hostname on framer.website");
    return { kind: "framer", isNoCode: true, evidence, generator };
  }
  if (host.endsWith(".webflow.io")) {
    evidence.unshift("hostname on webflow.io");
    return { kind: "webflow", isNoCode: true, evidence, generator };
  }
  if (host.endsWith(".carrd.co")) {
    evidence.unshift("hostname on carrd.co");
    return { kind: "carrd", isNoCode: true, evidence, generator };
  }
  if (host.endsWith(".wixsite.com") || host.endsWith(".editorx.io")) {
    evidence.unshift("hostname on wix");
    return { kind: "wix", isNoCode: true, evidence, generator };
  }
  if (host.endsWith(".squarespace.com")) {
    evidence.unshift("hostname on squarespace.com");
    return { kind: "squarespace", isNoCode: true, evidence, generator };
  }
  if (host.endsWith(".bubbleapps.io")) {
    evidence.unshift("hostname on bubbleapps.io");
    return { kind: "bubble", isNoCode: true, evidence, generator };
  }
  if (host.endsWith(".notion.site") || host.endsWith(".super.site")) {
    evidence.unshift("hostname on notion/super");
    return { kind: "notion", isNoCode: true, evidence, generator };
  }

  // Generator meta tag (authoritative on most no-code platforms).
  if (/framer/.test(gen)) {
    return { kind: "framer", isNoCode: true, evidence, generator };
  }
  if (/webflow/.test(gen)) {
    return { kind: "webflow", isNoCode: true, evidence, generator };
  }
  if (/carrd/.test(gen)) {
    return { kind: "carrd", isNoCode: true, evidence, generator };
  }
  if (/wix\.com|wix\s*/.test(gen)) {
    return { kind: "wix", isNoCode: true, evidence, generator };
  }
  if (/squarespace/.test(gen)) {
    return { kind: "squarespace", isNoCode: true, evidence, generator };
  }
  if (/bubble/.test(gen)) {
    return { kind: "bubble", isNoCode: true, evidence, generator };
  }
  if (/notion/.test(gen)) {
    return { kind: "notion", isNoCode: true, evidence, generator };
  }
  if (/wordpress/.test(gen)) {
    return { kind: "wordpress", isNoCode: false, evidence, generator };
  }

  // Fallback: asset host fingerprints in the first ~120KB of HTML.
  if (/assets\.framerstatic\.com|framerusercontent\.com/.test(lowerHtml)) {
    evidence.push("asset host: framerstatic/framerusercontent");
    return { kind: "framer", isNoCode: true, evidence, generator };
  }
  if (
    /assets\.website-files\.com|cdn\.prod\.website-files\.com|webflow\.com\/js/.test(
      lowerHtml
    )
  ) {
    evidence.push("asset host: webflow");
    return { kind: "webflow", isNoCode: true, evidence, generator };
  }
  if (/carrd\.co\/assets|carrd\.co\//.test(lowerHtml)) {
    evidence.push("asset host: carrd.co");
    return { kind: "carrd", isNoCode: true, evidence, generator };
  }
  if (/static\.wixstatic\.com|\bwix\.com\//.test(lowerHtml)) {
    evidence.push("asset host: wixstatic");
    return { kind: "wix", isNoCode: true, evidence, generator };
  }
  if (/static1\.squarespace\.com|assets\.squarespace\.com/.test(lowerHtml)) {
    evidence.push("asset host: squarespace");
    return { kind: "squarespace", isNoCode: true, evidence, generator };
  }
  if (/bubble\.io\/|d1muf25xaso8hp\.cloudfront\.net/.test(lowerHtml)) {
    evidence.push("asset host: bubble");
    return { kind: "bubble", isNoCode: true, evidence, generator };
  }
  if (/notion-static\.com|notion\.so\/|super\.so/.test(lowerHtml)) {
    evidence.push("asset host: notion/super");
    return { kind: "notion", isNoCode: true, evidence, generator };
  }

  // WordPress fingerprints (self-hosted or WordPress.com).
  if (
    /wp-content\/|\/wp-includes\/|wordpress/.test(lowerHtml) ||
    /wordpress/.test(poweredBy)
  ) {
    evidence.push("wp-content / wp-includes pattern");
    return { kind: "wordpress", isNoCode: false, evidence, generator };
  }

  // Common custom-stack fingerprints — Next.js, Gatsby, Nuxt, Remix, Astro, SvelteKit, Vercel.
  if (/__next_data__|next-route-announcer/.test(lowerHtml)) {
    evidence.push("Next.js runtime marker");
    return { kind: "custom", isNoCode: false, evidence, generator };
  }
  if (/<!--\s*nuxt-ssr|__nuxt|window\.__nuxt__/.test(lowerHtml)) {
    evidence.push("Nuxt runtime marker");
    return { kind: "custom", isNoCode: false, evidence, generator };
  }
  if (/gatsby-|___gatsby/.test(lowerHtml)) {
    evidence.push("Gatsby runtime marker");
    return { kind: "custom", isNoCode: false, evidence, generator };
  }
  if (/data-astro-cid|astro-island/.test(lowerHtml)) {
    evidence.push("Astro runtime marker");
    return { kind: "custom", isNoCode: false, evidence, generator };
  }
  if (/__remix|window\.__remixcontext|__remix-router/.test(lowerHtml)) {
    evidence.push("Remix runtime marker");
    return { kind: "custom", isNoCode: false, evidence, generator };
  }
  if (/data-sveltekit|__sveltekit_/.test(lowerHtml)) {
    evidence.push("SvelteKit runtime marker");
    return { kind: "custom", isNoCode: false, evidence, generator };
  }
  if (/vercel/.test(server) || /vercel/.test(headers.get("x-vercel-cache") ?? "")) {
    evidence.push("hosted on Vercel");
    return { kind: "custom", isNoCode: false, evidence, generator };
  }

  // Signal of some HTML activity but no match → "custom" (safer default for tech startups
  // than "unknown", which we reserve for fetch failures).
  if (html.length > 2_000) {
    evidence.push("no platform markers in top of HTML");
    return { kind: "custom", isNoCode: false, evidence, generator };
  }

  return { kind: "unknown", isNoCode: false, evidence, generator };
}

async function fetchBounded(
  url: string
): Promise<{ ok: true; html: string; headers: Headers } | { ok: false; reason: string }> {
  let res: Response;
  try {
    res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": "AgencyCRM-StackFingerprint/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } catch {
    return { ok: false, reason: "fetch-failed" };
  }
  if (!res.ok) return { ok: false, reason: `http-${res.status}` };
  const buf = await res.arrayBuffer();
  const slice = buf.byteLength > MAX_FETCH_BYTES ? buf.slice(0, MAX_FETCH_BYTES) : buf;
  const html = new TextDecoder("utf-8", { fatal: false }).decode(slice);
  return { ok: true, html, headers: res.headers };
}

export async function fingerprintSiteStack(rawUrl: string): Promise<StackFingerprint> {
  const normalized = normalizeUrlForFetch(rawUrl);
  if (!normalized) {
    return {
      kind: "unknown",
      isNoCode: false,
      evidence: ["invalid or blocked URL"],
      generator: null,
    };
  }
  const resp = await fetchBounded(normalized);
  if (!resp.ok) {
    return {
      kind: "unknown",
      isNoCode: false,
      evidence: [`fetch skipped: ${resp.reason}`],
      generator: null,
    };
  }
  try {
    const host = new URL(normalized).hostname;
    return classifyStackFromResponse(host, resp.html, resp.headers);
  } catch {
    return {
      kind: "unknown",
      isNoCode: false,
      evidence: ["url parse failed"],
      generator: null,
    };
  }
}
