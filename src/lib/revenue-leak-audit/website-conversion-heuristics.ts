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

export function countImageTags(html: string): {
  imageCount: number;
  blurryImageSignals: number;
  clientPhotoSignals: boolean;
  projectPhotoSignals: boolean;
  beforeAfterSignals: boolean;
} {
  const tags = html.match(/<img\s+[^>]*>/gi) ?? [];
  let blurry = 0;
  let client = false;
  let project = false;
  let beforeAfter = false;
  for (const tag of tags) {
    const width = Number(tag.match(/\bwidth=["']?(\d+)/i)?.[1] ?? NaN);
    const height = Number(tag.match(/\bheight=["']?(\d+)/i)?.[1] ?? NaN);
    const srcAlt = `${tag.match(/\bsrc=["']([^"']*)/i)?.[1] ?? ""} ${
      tag.match(/\balt=["']([^"']*)/i)?.[1] ?? ""
    }`;
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
  }
  return {
    imageCount: tags.length,
    blurryImageSignals: blurry,
    clientPhotoSignals: client,
    projectPhotoSignals: project,
    beforeAfterSignals: beforeAfter,
  };
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
