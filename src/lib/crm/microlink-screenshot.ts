/**
 * Microlink screenshot URL for a public page (used by prospect preview + website snapshot API).
 *
 * Works on the **anonymous free tier** (no signup) — Microlink advertises 50 reqs/day. When
 * `MICROLINK_API_KEY` is set we hit `pro.microlink.io` which has stronger anti-bot handling.
 *
 * The two main failure modes we see in practice on the free tier are:
 *   1. The target site has Cloudflare/Akamai/WAF rules that block Microlink's renderer and we
 *      get a Microlink response with no `screenshot.url`.
 *   2. Microlink returns a CDN URL but the CDN edge then 403s the second hop. We retry once
 *      with a stricter render strategy in that case.
 */

/**
 * Hide common CMP + promo shells before capture (see Microlink `styles`:
 * https://microlink.io/docs/guides/screenshot/page-interaction#injecting-custom-css ).
 * Set MICROLINK_SCREENSHOT_HIDE_OVERLAYS=false to disable.
 */
const MICROLINK_OVERLAY_HIDE_CSS = [
  "#onetrust-consent-sdk",
  ".onetrust-pc-dark-filter",
  "#CybotCookiebotDialog",
  "#CybotCookiebotDialogBodyUnderlay",
  ".cky-overlay",
  ".cky-consent-container",
  ".cookieyes-cc-wrapper",
  ".cmplz-cookiebanner",
  ".cli-modal-overlay",
  "div[id^='pum_popup']",
  ".pum-overlay",
  ".popmake-overlay",
  ".elementor-popup-modal",
  "[class*='poptin-']",
  ".privy-widget",
  ".sleeknote-modal",
  ".sumome-smcbasket",
].join(",");

type ScreenshotStrategy = "default" | "robust";

function buildMicrolinkParams(
  pageUrl: string,
  strategy: ScreenshotStrategy,
  hasApiKey: boolean,
): URLSearchParams {
  const params = new URLSearchParams({
    url: pageUrl,
    screenshot: "true",
    meta: "false",
    // Match a typical desktop viewport so hero sections render close to what users see.
    "viewport.width": "1280",
    "viewport.height": "800",
    "viewport.deviceScaleFactor": "1",
    // Capture above-the-fold only; full-page captures are slower and time out more often on free tier.
    "screenshot.fullPage": "false",
    "screenshot.type": "png",
  });

  const delayRaw = process.env.MICROLINK_SCREENSHOT_DELAY_MS?.trim();
  let delay: number | null = null;
  if (delayRaw && /^\d+$/.test(delayRaw)) {
    const n = Number(delayRaw);
    if (n > 0 && n <= 30_000) delay = n;
  }
  if (delay == null) {
    // Free tier needs a beat for consent banners + JS heroes; robust pass waits even longer.
    delay = strategy === "robust" ? 3500 : hasApiKey ? 800 : 1500;
  }
  params.set("screenshot.delay", String(delay));

  // Wait for the network to be (mostly) idle — much higher success on Wix/Squarespace/Webflow.
  params.set("waitUntil", strategy === "robust" ? "networkidle0" : "networkidle2");

  const hideOverlays =
    process.env.MICROLINK_SCREENSHOT_HIDE_OVERLAYS?.trim().toLowerCase() !== "false";
  if (hideOverlays) {
    params.set(
      "styles",
      `${MICROLINK_OVERLAY_HIDE_CSS}{display:none!important;visibility:hidden!important;pointer-events:none!important}`,
    );
  }

  if (strategy === "robust") {
    // Rotating proxy + adblock help on stubborn hosts. These params are accepted silently on the
    // free tier (ignored if not entitled) and used for real on Pro plans.
    params.set("proxy", "true");
    params.set("adblock", "true");
  }

  return params;
}

async function callMicrolinkOnce(
  pageUrl: string,
  strategy: ScreenshotStrategy,
  timeoutMs: number,
): Promise<string | null> {
  const apiKey = process.env.MICROLINK_API_KEY?.trim();
  const micBase = apiKey ? "https://pro.microlink.io" : "https://api.microlink.io";

  const params = buildMicrolinkParams(pageUrl, strategy, Boolean(apiKey));
  const micUrl = `${micBase}/?${params.toString()}`;

  const headers: HeadersInit = {
    accept: "application/json",
  };
  if (apiKey) headers["x-api-key"] = apiKey;

  try {
    const res = await fetch(micUrl, { headers, signal: AbortSignal.timeout(timeoutMs) });
    const text = await res.text();
    if (!res.ok) {
      console.warn(
        "[microlink] screenshot request failed",
        strategy,
        res.status,
        text.slice(0, 300),
      );
      return null;
    }
    let json: { data?: { screenshot?: { url?: string } }; message?: string; status?: string };
    try {
      json = JSON.parse(text) as typeof json;
    } catch {
      console.warn("[microlink] screenshot invalid JSON", strategy, text.slice(0, 200));
      return null;
    }
    const url = json?.data?.screenshot?.url?.trim();
    if (!url && json?.message) {
      console.warn("[microlink] screenshot", strategy, json.status ?? "", json.message);
    }
    return url || null;
  } catch (e) {
    console.warn("[microlink] screenshot error", strategy, e);
    return null;
  }
}

export async function fetchMicrolinkScreenshotUrl(
  pageUrl: string,
  timeoutMs = 45_000,
): Promise<string | null> {
  const first = await callMicrolinkOnce(pageUrl, "default", timeoutMs);
  if (first) return first;
  // Some hosts (Cloudflare bot fight, Wix anti-screenshot) only succeed with the slower,
  // proxied + longer-wait pass. We try once more before giving up.
  const second = await callMicrolinkOnce(pageUrl, "robust", timeoutMs);
  return second;
}
