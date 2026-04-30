import type { WebsiteAudit, WebsiteImageSeoSummary } from "./types";

export function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractFirstTagText(html: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = html.match(re);
  if (!match) return null;
  return stripTags(match[1]).slice(0, 220) || null;
}

export function extractMeta(html: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const byName = new RegExp(
    `<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`,
    "i"
  );
  const byContentFirst = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`,
    "i"
  );
  return (
    byName.exec(html)?.[1]?.trim().replace(/\s+/g, " ") ||
    byContentFirst.exec(html)?.[1]?.trim().replace(/\s+/g, " ") ||
    null
  );
}

export function hasAny(html: string, terms: RegExp[]): boolean {
  return terms.some((term) => term.test(html));
}

function imgSrcBasename(src: string): string {
  try {
    const pathOnly = src.split("?")[0].split("#")[0];
    const last = pathOnly.split("/").pop() ?? "";
    return decodeURIComponent(last);
  } catch {
    return src.split("/").pop() ?? "";
  }
}

function isGenericImageFilename(basename: string): boolean {
  const withoutExt = basename.replace(/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i, "");
  const base = withoutExt.trim();
  if (base.length < 4) return true;
  if (/^[a-f0-9]{10,}$/i.test(base)) return true;
  if (/^\d{1,5}$/.test(base)) return true;
  if (/^dsc_?\d+/i.test(base)) return true;
  const lower = base.toLowerCase();
  const stem = lower.replace(/\d+$/g, "");
  const genericTokens =
    /^(image|img|photo|pic|picture|banner|hero|header|footer|slide|slider|thumb|thumbnail|logo|icon|favicon|sprite|pixel|spacer|screenshot|untitled|asset|file|upload|temp|tmp|ad|ads)$/;
  if (genericTokens.test(lower) || genericTokens.test(stem)) return true;
  return /^[^a-z]*$/.test(base) && base.length < 12;
}

function isDecorativeImgTag(tag: string): boolean {
  return (
    /\brole=["']presentation["']/i.test(tag) ||
    /\baria-hidden=["']true["']/i.test(tag)
  );
}

function hasAltAttribute(tag: string): boolean {
  return /\balt\s*=/i.test(tag);
}

function getAltText(tag: string): string | null {
  const quoted = tag.match(/\balt\s*=\s*["']([^"']*)["']/i);
  if (quoted) return quoted[1];
  const unquoted = tag.match(/\balt\s*=\s*([^\s>]+)/i);
  return unquoted ? unquoted[1] : null;
}

function hasTitleAttribute(tag: string): boolean {
  return /\btitle\s*=/i.test(tag);
}

export function countImageTags(html: string): {
  imageCount: number;
  blurryImageSignals: number;
  clientPhotoSignals: boolean;
  projectPhotoSignals: boolean;
  beforeAfterSignals: boolean;
  imageSeo: WebsiteImageSeoSummary;
} {
  const tags = html.match(/<img\b[^>]*>/gi) ?? [];
  let blurry = 0;
  let client = false;
  let project = false;
  let beforeAfter = false;
  let missingAltAttribute = 0;
  let weakOrMissingAlt = 0;
  let missingTitle = 0;
  let genericFilename = 0;
  let largeDeclaredDimensions = 0;
  const genericFilenameSamples: string[] = [];
  for (const tag of tags) {
    const width = Number(tag.match(/\bwidth=["']?(\d+)/i)?.[1] ?? NaN);
    const height = Number(tag.match(/\bheight=["']?(\d+)/i)?.[1] ?? NaN);
    const srcRaw = tag.match(/\bsrc=["']([^"']*)["']/i)?.[1] ?? tag.match(/\bsrc=([^\s>]+)/i)?.[1] ?? "";
    const srcAlt = `${srcRaw} ${tag.match(/\balt=["']([^"']*)/i)?.[1] ?? ""}`;
    if (
      Number.isFinite(width) &&
      Number.isFinite(height) &&
      width > 0 &&
      height > 0 &&
      (width < 320 || height < 220)
    ) {
      blurry += 1;
    }
    if (/client|customer|team|staff|owner|technician/i.test(srcAlt)) client = true;
    if (/project|work|gallery|portfolio|job|install|repair|service/i.test(srcAlt)) {
      project = true;
    }
    if (/before|after/i.test(srcAlt)) beforeAfter = true;

    const decorative = isDecorativeImgTag(tag);
    if (!hasAltAttribute(tag)) {
      missingAltAttribute += 1;
      if (!decorative) weakOrMissingAlt += 1;
    } else {
      const altVal = getAltText(tag);
      const altTrim = altVal === null ? "" : altVal.trim();
      if (!decorative && altTrim.length === 0) {
        weakOrMissingAlt += 1;
      }
    }
    if (!hasTitleAttribute(tag)) missingTitle += 1;
    if (
      Number.isFinite(width) &&
      Number.isFinite(height) &&
      width >= 1920 &&
      height >= 1920
    ) {
      largeDeclaredDimensions += 1;
    }
    const base = imgSrcBasename(srcRaw);
    if (base && isGenericImageFilename(base)) {
      genericFilename += 1;
      if (genericFilenameSamples.length < 2 && !genericFilenameSamples.includes(base)) {
        genericFilenameSamples.push(base.length > 48 ? `${base.slice(0, 45)}…` : base);
      }
    }
  }
  return {
    imageCount: tags.length,
    blurryImageSignals: blurry,
    clientPhotoSignals: client,
    projectPhotoSignals: project,
    beforeAfterSignals: beforeAfter,
    imageSeo: {
      missingAltAttribute,
      weakOrMissingAlt,
      missingTitle,
      genericFilename,
      largeDeclaredDimensions,
      genericFilenameSamples,
    },
  };
}

/**
 * Heuristic: homepage HTML appears to showcase customer/Google reviews or ratings (conversion social proof).
 */
export function detectHomepageReviewShowcase(html: string): boolean {
  const lower = html.toLowerCase();
  if (/aggregateRating|reviewCount|"@type"\s*:\s*"\s*Review\s*"/i.test(html)) return true;
  if (/application\/ld\+json/i.test(html) && /aggregaterating|\breviews?\b.*rating/i.test(lower)) return true;
  if (
    /google\.com\/maps\/embed|reviews?\.google\.com\/embed|!1m4!1m3!1s/i.test(lower)
  ) {
    return true;
  }
  if (
    /trustpilot|birdeye|podium|reputation\.com|gatherup|grade\.us|reviewsonmywebsite|embedsocial|senja\.io|widg\.io\/review/i.test(
      lower,
    )
  ) {
    return true;
  }
  if (
    /class=["'][^"']*(?:testimonial|review|google-review|reviews-section|customer-review|star-rating)[^"']*["']/i.test(
      html,
    )
  ) {
    return true;
  }
  if (/id=["'][^"']*(?:testimonial|reviews|google-reviews)[^"']*["']/i.test(html)) return true;
  if (
    /\b(what\s+our\s+customers?\s+say|customer\s+reviews?\s+&|read\s+our\s+reviews|see\s+our\s+reviews|google\s+reviews?)\b/i.test(
      lower,
    )
  ) {
    return true;
  }
  if (/\b\d\.\d\s*(?:stars?|out\s+of\s+5|\/\s*5)\b/i.test(lower) && /\breview/i.test(lower)) return true;
  return false;
}

export const CTA_TERMS = [
  /get\s+(a\s+)?quote/i,
  /request\s+(an?\s+)?estimate/i,
  /free\s+estimate/i,
  /book\s+(now|online|service)/i,
  /schedule\s+(now|service|appointment)/i,
  /call\s+(now|today)/i,
  /contact\s+us/i,
];

export type WebChatDetection = {
  detected: boolean;
  provider: string | null;
};

const WEB_CHAT_SIGNATURES: Array<{ provider: string; pattern: RegExp }> = [
  { provider: "Intercom", pattern: /intercom\.io|widget\.intercom\.io|intercomcdn\.com|window\.Intercom\b|Intercom\(['"]boot['"]/i },
  { provider: "Drift", pattern: /js\.driftt\.com|drift\.com\/buid|drift\.load\(/i },
  { provider: "Zendesk Chat", pattern: /static\.zdassets\.com\/ekr\/snippet\.js|zopim\.com|\$zopim|zEACLoader/i },
  { provider: "Tidio", pattern: /code\.tidio\.co|tidiochat|tidio-chat-iframe|tidio\.com\b/i },
  { provider: "Crisp", pattern: /client\.crisp\.chat|window\.\$crisp|crisp\.chat\b/i },
  { provider: "LiveChat", pattern: /cdn\.livechatinc\.com|livechatinc\b/i },
  { provider: "HubSpot Chat", pattern: /js\.hs-scripts\.com|hubspot-conversations|hs-messages-iframe/i },
  { provider: "Tawk.to", pattern: /embed\.tawk\.to|tawk\.to\/chat\b|Tawk_API\b/i },
  { provider: "Olark", pattern: /static\.olark\.com|olark\.identify\(/i },
  { provider: "Facebook Messenger", pattern: /fb-customerchat|connect\.facebook\.net\/[^"']+\/sdk\/xfbml\.customerchat\.js/i },
  { provider: "WhatsApp", pattern: /href=["'](?:https?:)?\/\/(?:wa\.me|api\.whatsapp\.com\/send)/i },
  { provider: "LeadConnector / GoHighLevel", pattern: /widgets\.leadconnectorhq\.com|leadconnector\.chat|gohighlevel\.chat/i },
  { provider: "Smartsupp", pattern: /smartsuppchat\.com|_smartsupp\b/i },
  { provider: "Gorgias", pattern: /config\.gorgias\.chat|gorgias\.chat\b/i },
  { provider: "Freshchat", pattern: /wchat\.freshchat\.com|fcWidget\b/i },
  { provider: "Pure Chat", pattern: /app\.purechat\.com\/VisitorWidget/i },
  { provider: "Generic chat widget", pattern: /id=["'][^"']*(?:chat-widget|live-chat|chatbot|chat_bubble)[^"']*["']|class=["'][^"']*(?:chat-widget|live-chat|chatbot|chat-bubble)[^"']*["']/i },
];

export function detectWebChat(html: string): WebChatDetection {
  for (const { provider, pattern } of WEB_CHAT_SIGNATURES) {
    if (pattern.test(html)) {
      return { detected: true, provider };
    }
  }
  return { detected: false, provider: null };
}

/**
 * SMS / mobile-text contact paths (native `sms:` links, common business-texting widgets, WhatsApp, or explicit copy).
 */
export function detectTextEnabledPhone(html: string): boolean {
  if (/href\s*=\s*["']sms:/i.test(html) || /href\s*=\s*["']smsto:/i.test(html)) return true;
  if (/href\s*=\s*["']imessage:/i.test(html)) return true;
  if (/href\s*=\s*["']https?:\/\/wa\.me\//i.test(html)) return true;
  if (/href\s*=\s*["']https?:\/\/api\.whatsapp\.com\/send/i.test(html)) return true;
  if (/href\s*=\s*["']https?:\/\/web\.whatsapp\.com\/send/i.test(html)) return true;

  const lower = html.toLowerCase();
  if (
    /\btextus\b|\.textus\.|gubagoo|kenect\.|podiumassets|assets\.podium|zipwhip|sleeknote[^\n]{0,80}sms|click\s*to\s*text\b|txt-?2-?join|join\.txt|birdeye[^\n]{0,40}\/sms/i.test(
      lower
    )
  ) {
    return true;
  }

  if (
    /\b(?:text|sms)\s+us\b/i.test(html) ||
    /\bsend\s+(?:us\s+)?a\s+text\b/i.test(html) ||
    /\btext\s+(?:the\s+)?(?:office|team|practice)\b/i.test(html) ||
    /\bclick\s+to\s+text\b/i.test(html) ||
    /\btext\s+for\s+(?:a\s+)?(?:appointment|appt|quote|estimate)\b/i.test(html)
  ) {
    return true;
  }

  if (/\bdata-sms-link\b/i.test(html) || /\bdata-action\s*=\s*["']sms:/i.test(html)) return true;

  return false;
}

export const TRUST_TERMS = [
  /testimonial/i,
  /reviews?/i,
  /rated\s+\d/i,
  /stars?/i,
  /happy\s+customers?/i,
  /licensed/i,
  /insured/i,
  /guarantee/i,
  /warranty/i,
  /case\s+stud(y|ies)/i,
];

function hrefToAbsoluteUrl(raw: string): URL | null {
  const t = raw.trim();
  if (!t || t.startsWith("javascript:") || t === "#") return null;
  try {
    return new URL(t);
  } catch {
    try {
      if (t.startsWith("//")) return new URL(`https:${t}`);
      return new URL(`https://${t.replace(/^\/\//, "")}`);
    } catch {
      return null;
    }
  }
}

function firstSocialHref(html: string, hostPattern: RegExp): string | null {
  const hrefRe = /href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefRe.exec(html)) !== null) {
    const raw = match[1].trim();
    if (!hostPattern.test(raw)) continue;
    const u = hrefToAbsoluteUrl(/^https?:\/\//i.test(raw) ? raw : raw.startsWith("//") ? `https:${raw}` : raw);
    if (u) return u.toString();
  }
  return null;
}

/** Normalize WhatsApp chat links to https://wa.me/&lt;digits&gt; when possible. */
function normalizeWhatsAppUrl(u: URL): string {
  const host = u.hostname.replace(/^www\./i, "").toLowerCase();
  if (host === "wa.me") {
    const digits = u.pathname.replace(/^\//, "").replace(/\D/g, "");
    if (digits.length >= 8) return `https://wa.me/${digits}`;
  }
  if (host === "api.whatsapp.com") {
    const phone = u.searchParams.get("phone")?.replace(/\D/g, "");
    if (phone && phone.length >= 8) return `https://wa.me/${phone}`;
  }
  if (host === "web.whatsapp.com") {
    const phone = u.searchParams.get("phone")?.replace(/\D/g, "");
    if (phone && phone.length >= 8) return `https://wa.me/${phone}`;
  }
  return u.toString();
}

function firstWhatsAppHref(html: string): string | null {
  const hrefRe = /href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefRe.exec(html)) !== null) {
    const raw = match[1].trim();
    if (!/(^|\/\/)(?:www\.)?wa\.me\b|api\.whatsapp\.com|web\.whatsapp\.com/i.test(raw)) continue;
    const u = hrefToAbsoluteUrl(/^https?:\/\//i.test(raw) ? raw : raw.startsWith("//") ? `https:${raw}` : raw);
    if (!u) continue;
    return normalizeWhatsAppUrl(u);
  }
  return null;
}

/** Scan anchor hrefs for major social profiles (used by Revenue Leak website audit). */
export function extractWebsiteSocialLinks(html: string): WebsiteAudit["socialLinks"] {
  return {
    facebook: firstSocialHref(html, /(?:^|\/\/)(?:www\.)?facebook\.com/i),
    instagram: firstSocialHref(html, /(?:^|\/\/)(?:www\.)?instagram\.com/i),
    tiktok: firstSocialHref(html, /(?:^|\/\/)(?:www\.)?tiktok\.com/i),
    youtube: firstSocialHref(html, /(?:^|\/\/)(?:www\.)?(?:youtube\.com|youtu\.be)/i),
    linkedin: firstSocialHref(html, /(?:^|\/\/)(?:www\.)?linkedin\.com\/(?:company|in)\b/i),
    whatsapp: firstWhatsAppHref(html),
  };
}
