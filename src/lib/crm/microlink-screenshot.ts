/**
 * Microlink screenshot URL for a public page (used by prospect preview + website snapshot API).
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

export async function fetchMicrolinkScreenshotUrl(
  pageUrl: string,
  timeoutMs = 60_000
): Promise<string | null> {
  const apiKey = process.env.MICROLINK_API_KEY?.trim();
  const micBase = apiKey ? "https://pro.microlink.io" : "https://api.microlink.io";

  const params = new URLSearchParams({
    url: pageUrl,
    screenshot: "true",
    meta: "false",
  });
  const hideOverlays =
    process.env.MICROLINK_SCREENSHOT_HIDE_OVERLAYS?.trim().toLowerCase() !== "false";
  if (hideOverlays) {
    params.set(
      "styles",
      `${MICROLINK_OVERLAY_HIDE_CSS}{display:none!important;visibility:hidden!important;pointer-events:none!important}`,
    );
  }

  const micUrl = `${micBase}/?${params.toString()}`;

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
