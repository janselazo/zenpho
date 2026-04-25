/**
 * Lightweight, best-effort e-commerce platform fingerprint.
 *
 * Sister module to `tech-stack-fingerprint.ts`, but scoped to e-commerce platforms
 * (Shopify, WooCommerce, Magento, BigCommerce, Wix Stores, Squarespace Commerce).
 *
 * Used by the Ecom Brands prospecting tab to verify Apollo company hits and to render
 * a platform pill on each result. The detection is intentionally conservative: when no
 * strong markers appear in the homepage HTML or response headers, we return "unknown"
 * rather than guessing.
 */

import { normalizeUrlForFetch } from "@/lib/crm/safe-url-fetch";

export type EcomPlatform =
  | "shopify"
  | "woocommerce"
  | "magento"
  | "bigcommerce"
  | "wix_stores"
  | "squarespace_commerce"
  | "other"
  | "unknown";

export type EcomPlatformFingerprint = {
  platform: EcomPlatform;
  /** True for the four "real" ecom platforms we score most highly. */
  isVerifiedEcom: boolean;
  /** Short human labels describing why we picked this platform. */
  evidence: string[];
  /** HTML generator meta tag, if any. */
  generator: string | null;
};

export const ECOM_PLATFORM_LABELS: Record<EcomPlatform, string> = {
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  magento: "Magento",
  bigcommerce: "BigCommerce",
  wix_stores: "Wix Stores",
  squarespace_commerce: "Squarespace Commerce",
  other: "Other ecom",
  unknown: "Unknown",
};

export const ECOM_PLATFORM_PILL_COLOR: Record<EcomPlatform, string> = {
  shopify: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  woocommerce: "bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300",
  magento: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
  bigcommerce: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  wix_stores: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  squarespace_commerce: "bg-zinc-100 text-zinc-800 dark:bg-zinc-500/15 dark:text-zinc-300",
  other: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
  unknown: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700/40 dark:text-zinc-400",
};

const VERIFIED_ECOM: ReadonlySet<EcomPlatform> = new Set([
  "shopify",
  "woocommerce",
  "magento",
  "bigcommerce",
]);

export function ecomPlatformLabel(p: EcomPlatform): string {
  return ECOM_PLATFORM_LABELS[p];
}

export function isVerifiedEcomPlatform(p: EcomPlatform): boolean {
  return VERIFIED_ECOM.has(p);
}

const FETCH_TIMEOUT_MS = 8_000;
const MAX_FETCH_BYTES = 120_000;

function matchGenerator(html: string): string | null {
  const m =
    html.match(/<meta\s+[^>]*name=["']generator["'][^>]*content=["']([^"']+)["']/i) ??
    html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']generator["']/i);
  return m?.[1]?.trim() ?? null;
}

export function classifyEcomFromResponse(
  hostname: string,
  html: string,
  headers: Headers
): EcomPlatformFingerprint {
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

  // Shopify ────────────────────────────────────────────────────────────
  if (host.endsWith(".myshopify.com")) {
    evidence.unshift("hostname on myshopify.com");
    return shopify(evidence, generator);
  }
  if (
    headers.get("x-shopify-stage") ||
    headers.get("x-shopid") ||
    headers.get("x-shopify-shop-api-call-limit") ||
    /shopify/.test(poweredBy)
  ) {
    evidence.unshift("Shopify response header");
    return shopify(evidence, generator);
  }
  if (/shopify/.test(gen)) {
    return shopify(evidence, generator);
  }
  if (
    /cdn\.shopify\.com|cdn\.shopifycdn\.net|window\.shopify\b|shopify\.theme|\/shopify_pay\/|shopify-section|shopify_pay|shopify_checkout/.test(
      lowerHtml
    )
  ) {
    evidence.push("Shopify asset/script marker");
    return shopify(evidence, generator);
  }

  // WooCommerce (sits on top of WordPress) ─────────────────────────────
  if (
    /wp-content\/plugins\/woocommerce|class=["'][^"']*\bwoocommerce\b|wc-ajax=|wc-blocks-|wc_add_to_cart|woocommerce-page/.test(
      lowerHtml
    )
  ) {
    evidence.push("WooCommerce script/class marker");
    return {
      platform: "woocommerce",
      isVerifiedEcom: true,
      evidence,
      generator,
    };
  }

  // Magento ─────────────────────────────────────────────────────────────
  if (/magento/.test(gen)) {
    return {
      platform: "magento",
      isVerifiedEcom: true,
      evidence,
      generator,
    };
  }
  if (
    /\/skin\/frontend\/(?:default|mage)|magento_theme|mage\/cookies\.js|var bluefoot|\/static\/version\d+\/frontend\/magento|mage-loader/.test(
      lowerHtml
    )
  ) {
    evidence.push("Magento asset/script marker");
    return {
      platform: "magento",
      isVerifiedEcom: true,
      evidence,
      generator,
    };
  }

  // BigCommerce ─────────────────────────────────────────────────────────
  if (
    /cdn11\.bigcommerce\.com|cdn\.bigcommerce\.com|stencil-utils|bigcommerce\.com\/stencil|bcapp\.dev/.test(
      lowerHtml
    )
  ) {
    evidence.push("BigCommerce asset/stencil marker");
    return {
      platform: "bigcommerce",
      isVerifiedEcom: true,
      evidence,
      generator,
    };
  }

  // Wix Stores ──────────────────────────────────────────────────────────
  const onWixHost =
    host.endsWith(".wixsite.com") ||
    host.endsWith(".editorx.io") ||
    /static\.wixstatic\.com|\bwix\.com\//.test(lowerHtml) ||
    /wix\.com|wix\s*/.test(gen);
  if (
    onWixHost &&
    /wix-stores|wixstores|stores\.wixapps\.com|ecom-platform|ecommerce-platform|com\.wixpress\.npm\.communities-blog|wix-ecommerce/.test(
      lowerHtml
    )
  ) {
    evidence.push("Wix Stores marker on Wix host");
    return {
      platform: "wix_stores",
      isVerifiedEcom: false,
      evidence,
      generator,
    };
  }

  // Squarespace Commerce ────────────────────────────────────────────────
  const onSqHost =
    host.endsWith(".squarespace.com") ||
    /static1\.squarespace\.com|assets\.squarespace\.com/.test(lowerHtml) ||
    /squarespace/.test(gen);
  if (
    onSqHost &&
    /\/api\/commerce|sqs-add-to-cart-button|squarespace-commerce|commerce-product-form|productitem-product-price/.test(
      lowerHtml
    )
  ) {
    evidence.push("Squarespace Commerce marker on Squarespace host");
    return {
      platform: "squarespace_commerce",
      isVerifiedEcom: false,
      evidence,
      generator,
    };
  }

  // Generic ecom hint without a known platform — surfaces as "other".
  if (
    /add[-_ ]to[-_ ]cart|product-form|class=["'][^"']*\b(?:cart|checkout|product)\b/.test(
      lowerHtml
    ) &&
    /<form[^>]*(?:cart|checkout|product)/i.test(lowerHtml)
  ) {
    evidence.push("generic cart/product form markup");
    return {
      platform: "other",
      isVerifiedEcom: false,
      evidence,
      generator,
    };
  }

  return {
    platform: "unknown",
    isVerifiedEcom: false,
    evidence: evidence.length ? evidence : ["no ecom markers in top of HTML"],
    generator,
  };
}

function shopify(evidence: string[], generator: string | null): EcomPlatformFingerprint {
  return {
    platform: "shopify",
    isVerifiedEcom: true,
    evidence,
    generator,
  };
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
        "User-Agent": "AgencyCRM-EcomFingerprint/1.0",
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

export async function fingerprintEcomPlatform(
  rawUrl: string
): Promise<EcomPlatformFingerprint> {
  const normalized = normalizeUrlForFetch(rawUrl);
  if (!normalized) {
    return {
      platform: "unknown",
      isVerifiedEcom: false,
      evidence: ["invalid or blocked URL"],
      generator: null,
    };
  }
  const resp = await fetchBounded(normalized);
  if (!resp.ok) {
    return {
      platform: "unknown",
      isVerifiedEcom: false,
      evidence: [`fetch skipped: ${resp.reason}`],
      generator: null,
    };
  }
  try {
    const host = new URL(normalized).hostname;
    return classifyEcomFromResponse(host, resp.html, resp.headers);
  } catch {
    return {
      platform: "unknown",
      isVerifiedEcom: false,
      evidence: ["url parse failed"],
      generator: null,
    };
  }
}
