/**
 * Parse public contact signals from HTML (mailto, tel, JSON-LD). Used for prospect enrichment.
 */

import type { ProspectSocialUrls } from "@/lib/crm/prospect-enrichment-types";
import { EMPTY_PROSPECT_SOCIAL_URLS } from "@/lib/crm/prospect-enrichment-types";

const JUNK_LOCAL = /^no-?reply|^donotreply|^mailer-daemon|^postmaster|^bounce/i;

function junkDomain(dom: string): boolean {
  const d = dom.toLowerCase();
  return (
    d.endsWith("sentry.io") ||
    d.endsWith("wixpress.com") ||
    d.endsWith("cloudflare.com") ||
    d === "google.com" ||
    d === "facebook.com"
    // Intentionally not blocking gmail.com / yahoo.com / etc. — many SMBs list personal email in footers.
  );
}

/** TLDs that are almost always static assets, not email hosts (e.g. flags@2x.png). */
const ASSET_LIKE_TLD = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "ico",
  "bmp",
  "avif",
  "heic",
  "tif",
  "tiff",
  "css",
  "js",
  "mjs",
  "cjs",
  "map",
  "woff",
  "woff2",
  "ttf",
  "eot",
]);

function domainLooksLikeAssetFilename(dom: string): boolean {
  const labels = dom.toLowerCase().split(".").filter(Boolean);
  if (labels.length < 2) return false;
  const tld = labels[labels.length - 1];
  return ASSET_LIKE_TLD.has(tld);
}

export function isJunkEmail(raw: string): boolean {
  const e = raw.trim().toLowerCase();
  if (!e.includes("@")) return true;
  const at = e.lastIndexOf("@");
  const local = e.slice(0, at);
  const dom = e.slice(at + 1);
  if (!dom || JUNK_LOCAL.test(local)) return true;
  if (junkDomain(dom)) return true;
  if (domainLooksLikeAssetFilename(dom)) return true;
  return false;
}

function normalizeTel(raw: string): string | null {
  const t = raw.replace(/[^\d+]/g, "");
  return t.length >= 10 ? t : null;
}

function walkLdJson(
  node: unknown,
  acc: { founderName: string | null; emails: Set<string>; phones: Set<string> }
): void {
  const visit = (o: unknown): void => {
    if (o == null) return;
    if (typeof o === "string") {
      if (/^[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(o) && !isJunkEmail(o)) {
        acc.emails.add(o.trim().toLowerCase());
      }
      return;
    }
    if (Array.isArray(o)) {
      o.forEach(visit);
      return;
    }
    if (typeof o !== "object") return;
    const obj = o as Record<string, unknown>;
    const t = obj["@type"];
    const types = Array.isArray(t) ? t.map(String) : t != null ? [String(t)] : [];

    if (types.some((x) => /Organization|LocalBusiness|Store|Restaurant/i.test(x))) {
      const founder = obj.founder;
      if (founder && typeof founder === "object") {
        const fn = (founder as Record<string, unknown>).name;
        if (typeof fn === "string" && fn.trim()) acc.founderName = acc.founderName || fn.trim();
      }
      const own = obj.owner;
      if (own && typeof own === "object") {
        const fn = (own as Record<string, unknown>).name;
        if (typeof fn === "string" && fn.trim()) acc.founderName = acc.founderName || fn.trim();
      }
      const email = obj.email;
      if (typeof email === "string" && !isJunkEmail(email)) acc.emails.add(email.trim().toLowerCase());
      const tel = obj.telephone;
      if (typeof tel === "string") {
        const n = normalizeTel(tel);
        if (n) acc.phones.add(n);
      }
    }
    if (types.some((x) => /Person/i.test(x))) {
      const n = obj.name;
      if (typeof n === "string" && /founder|owner|ceo|president/i.test(JSON.stringify(obj))) {
        acc.founderName = acc.founderName || n.trim();
      }
    }
    for (const v of Object.values(obj)) visit(v);
  };
  visit(node);
}

/**
 * Decode Cloudflare Email Protection obfuscated strings (data-cfemail attribute).
 * Many WordPress/Cloudflare sites use this to hide emails from bots.
 */
export function decodeCfEmail(encoded: string): string | null {
  if (!encoded || encoded.length < 4 || encoded.length % 2 !== 0) return null;
  try {
    const key = parseInt(encoded.substring(0, 2), 16);
    let email = "";
    for (let i = 2; i < encoded.length; i += 2) {
      email += String.fromCharCode(parseInt(encoded.substring(i, i + 2), 16) ^ key);
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email.toLowerCase() : null;
  } catch {
    return null;
  }
}

function extractCfEmails(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/data-cfemail=["']([0-9a-fA-F]+)["']/gi)) {
    const decoded = decodeCfEmail(m[1]);
    if (decoded && !isJunkEmail(decoded)) out.push(decoded);
  }
  for (const m of html.matchAll(/\/cdn-cgi\/l\/email-protection#([0-9a-fA-F]+)/gi)) {
    const decoded = decodeCfEmail(m[1]);
    if (decoded && !isJunkEmail(decoded)) out.push(decoded);
  }
  return out;
}

function decodeBasicHtmlEntities(raw: string): string {
  return raw
    .replace(/&commat;/gi, "@")
    .replace(/&#0*64;/g, "@")
    .replace(/&#x0*40;/gi, "@")
    .replace(/&period;/gi, ".")
    .replace(/&#0*46;/g, ".")
    .replace(/&#x0*2e;/gi, ".")
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;|&#0*160;|&#x0*a0;/gi, " ");
}

export function extractPublicContactHints(html: string): {
  emails: string[];
  phones: string[];
  founderName: string | null;
} {
  const emails = new Set<string>();
  const phones = new Set<string>();
  let founderName: string | null = null;

  const decodedHtml = decodeBasicHtmlEntities(html);

  for (const m of decodedHtml.matchAll(/mailto:([^\s'"<>]+)/gi)) {
    const addr = decodeURIComponent(m[1].split("?")[0]).trim();
    if (addr && !isJunkEmail(addr)) emails.add(addr.toLowerCase());
  }
  for (const m of decodedHtml.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)) {
    const e = m[0];
    if (!isJunkEmail(e)) emails.add(e.toLowerCase());
  }

  for (const cf of extractCfEmails(html)) {
    emails.add(cf);
  }
  for (const m of html.matchAll(/tel:([^\s'"<>]+)/gi)) {
    const n = normalizeTel(decodeURIComponent(m[1].split("?")[0]));
    if (n) phones.add(n);
  }

  const ldRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let lm: RegExpExecArray | null;
  while ((lm = ldRe.exec(html)) !== null) {
    try {
      const data = JSON.parse(lm[1].trim());
      const acc = {
        founderName: null as string | null,
        emails: new Set<string>(),
        phones: new Set<string>(),
      };
      walkLdJson(data, acc);
      if (acc.founderName) founderName = founderName || acc.founderName;
      acc.emails.forEach((e) => emails.add(e));
      acc.phones.forEach((p) => phones.add(p));
    } catch {
      /* invalid JSON-LD */
    }
  }

  return {
    emails: [...emails],
    phones: [...phones],
    founderName,
  };
}

/**
 * Slugs that hint at a contact / about / team / locations page. Match against a single path
 * segment so we accept Wix-style numbered slugs like `/contact-8`, `/contact-1`, `/about-us-2`,
 * Squarespace / WordPress variants like `/our-team`, `/meet-the-team`, and i18n equivalents.
 */
const CONTACT_SLUG_KEYWORDS: readonly string[] = [
  "contact",
  "contacts",
  "contact-us",
  "contactus",
  "get-in-touch",
  "getintouch",
  "say-hello",
  "reach-us",
  "reachus",
  "talk",
  "lets-talk",
  "inquiry",
  "inquiries",
  "enquiries",
  "booking",
  "bookings",
  "book-now",
  "book",
  "appointment",
  "appointments",
  "about",
  "about-us",
  "aboutus",
  "our-story",
  "story",
  "who-we-are",
  "team",
  "teams",
  "our-team",
  "ourteam",
  "meet-the-team",
  "meet",
  "staff",
  "leadership",
  "people",
  "company",
  "location",
  "locations",
  "where-we-are",
  "find-us",
  "kontakt",
  "kontakto",
  "contatti",
  "contattaci",
  "contacto",
  "contactanos",
  "contactenos",
  "nous-contacter",
  "contactez-nous",
  "contactez",
];

/** Word-content hint (used against link text + raw href for soft scoring). */
const CONTACT_HINT =
  /\b(contact|about|team|location|locations|staff|leadership|kontakt|contatti|contacto|inquiry|inquiries|booking|reach|hello|talk|story)\b/i;

/** True when any path segment starts with a contact-style keyword. */
function pathHasContactSlug(path: string): boolean {
  const segments = path.toLowerCase().split("/").filter(Boolean);
  if (segments.length === 0) return false;
  return segments.some((seg) =>
    CONTACT_SLUG_KEYWORDS.some(
      (kw) => seg === kw || seg.startsWith(`${kw}-`) || seg.startsWith(`${kw}_`),
    ),
  );
}

/** Same registrable host only; scored internal links for contact-style pages. */
export function discoverContactPageUrls(html: string, baseUrl: string, max = 8): string[] {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return [];
  }
  const host = base.hostname.replace(/^www\./i, "");
  const seen = new Set<string>();
  const scored: { url: string; score: number }[] = [];

  const re = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1].trim();
    const inner = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (/^(javascript:|mailto:|tel:|#)/i.test(href)) continue;
    let abs: URL;
    try {
      abs = new URL(href, base);
    } catch {
      continue;
    }
    if (abs.protocol !== "http:" && abs.protocol !== "https:") continue;
    if (abs.hostname.replace(/^www\./i, "") !== host) continue;
    const path = abs.pathname;
    if (path === "/" || path === base.pathname) continue;

    let score = 0;
    if (pathHasContactSlug(path)) score += 4;
    if (CONTACT_HINT.test(inner)) score += 2;
    if (CONTACT_HINT.test(href)) score += 1;

    const url = abs.toString().replace(/#.*$/, "");
    if (score === 0 || seen.has(url)) continue;
    seen.add(url);
    scored.push({ url, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, max).map((s) => s.url);
}

/**
 * When in-page link discovery finds nothing (SPA navs / hidden mobile menus), guess common
 * paths so we still try a contact page. Tried in order; caller can de-dup against discovered URLs.
 */
const FALLBACK_CONTACT_PATHS: readonly string[] = [
  "/contact",
  "/contact-us",
  "/contact-1",
  "/contact-8",
  "/about",
  "/about-us",
  "/our-team",
  "/team",
  "/locations",
  "/booking",
  "/get-in-touch",
];

export function fallbackContactPageGuesses(baseUrl: string): string[] {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return [];
  }
  return FALLBACK_CONTACT_PATHS.map((p) => {
    try {
      return new URL(p, base).toString();
    } catch {
      return null;
    }
  }).filter((u): u is string => Boolean(u));
}

function emailRankScore(email: string): number {
  const local = email.split("@")[0] || "";
  const dom = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  if (/^(contact|info|hello|office|sales|support|admin|team)\b/i.test(local)) return 100;
  if (
    /^(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|icloud|me|aol)\.com$/i.test(dom) ||
    /^protonmail\.com$/i.test(dom)
  ) {
    return 5;
  }
  return 10;
}

export function rankEmailsUnique(emails: string[]): string[] {
  const uniq = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  uniq.sort((a, b) => emailRankScore(b) - emailRankScore(a) || a.localeCompare(b));
  return uniq;
}

export function pageLabelFromUrl(url: string, home: string): string {
  try {
    const u = new URL(url);
    const h = new URL(home);
    if (u.pathname === "/" || u.pathname === h.pathname) return "/ (homepage)";
    return u.pathname || url;
  } catch {
    return url;
  }
}

function stripSocialTracking(u: URL): string {
  const copy = new URL(u.toString());
  copy.hash = "";
  const host = copy.hostname.replace(/^www\./i, "").toLowerCase();
  if (
    host.endsWith("instagram.com") ||
    host.endsWith("facebook.com") ||
    host === "fb.com" ||
    host.endsWith("tiktok.com") ||
    host.endsWith("youtube.com") ||
    host === "youtu.be"
  ) {
    copy.search = "";
  }
  return copy.toString();
}

/** Decode minimal HTML entities in raw `href` before `URL()` (themes often leave `&amp;` or `&#038;` in attributes). */
function decodeHrefForUrl(raw: string): string {
  let s = raw.trim();
  s = s.replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;/g, "'");
  s = s.replace(/&#0*38;/gi, "&").replace(/&#[xX]26;/gi, "&");
  try {
    s = decodeURIComponent(s);
  } catch {
    /* keep */
  }
  return s;
}

export function mergeProspectSocialUrls(...parts: ProspectSocialUrls[]): ProspectSocialUrls {
  const out: ProspectSocialUrls = { ...EMPTY_PROSPECT_SOCIAL_URLS };
  for (const p of parts) {
    if (!out.facebook && p.facebook) out.facebook = p.facebook;
    if (!out.instagram && p.instagram) out.instagram = p.instagram;
    if (!out.linkedin && p.linkedin) out.linkedin = p.linkedin;
    if (!out.twitter && p.twitter) out.twitter = p.twitter;
    if (!out.tiktok && p.tiktok) out.tiktok = p.tiktok;
    if (!out.youtube && p.youtube) out.youtube = p.youtube;
    if (!out.whatsapp && p.whatsapp) out.whatsapp = p.whatsapp;
  }
  return out;
}

/** Instagram profile path segment (handles are mostly [a-z0-9._]; some themes use hyphens). */
const INSTAGRAM_HANDLE_SEGMENT = /^[a-z0-9._-]+$/i;

function applySocialUrlToProspect(out: ProspectSocialUrls, u: URL): void {
  if (u.protocol === "whatsapp:") {
    if (!out.whatsapp) {
      const ph =
        u.searchParams.get("phone")?.replace(/\D/g, "") ||
        u.pathname.replace(/^\/+/, "").replace(/\D/g, "");
      if (ph.length >= 8 && ph.length <= 15) {
        out.whatsapp = `https://wa.me/${ph}`;
      }
    }
    return;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return;
  const host = u.hostname.replace(/^www\./i, "").toLowerCase();

  if (
    !out.facebook &&
    (host === "facebook.com" ||
      host === "fb.com" ||
      host === "m.facebook.com" ||
      host === "l.facebook.com")
  ) {
    const seg = u.pathname.split("/").filter(Boolean)[0]?.toLowerCase() ?? "";
    const skip = new Set([
      "sharer",
      "dialog",
      "plugins",
      "share.php",
      "login",
      "groups",
      "events",
      "marketplace",
      "watch",
      "gaming",
      "reel",
      "reels",
      "stories",
      "ads",
      "business",
      "policy",
      "help",
      "privacy",
    ]);
    if (seg && !skip.has(seg) && u.pathname.replace(/\/$/, "").length > 1) {
      out.facebook = stripSocialTracking(u);
    }
  }

  if (
    !out.instagram &&
    (host === "instagram.com" || host === "m.instagram.com" || host === "l.instagram.com")
  ) {
    const parts = u.pathname.split("/").filter(Boolean);
    const first = parts[0]?.toLowerCase() ?? "";
    if (["p", "reel", "reels", "stories", "tv", "explore", "accounts"].includes(first)) return;
    if (parts.length >= 1 && INSTAGRAM_HANDLE_SEGMENT.test(parts[0] ?? "")) {
      out.instagram = stripSocialTracking(u);
    }
  }

  if (!out.linkedin && host === "linkedin.com") {
    const p = u.pathname.toLowerCase();
    if (p.includes("/in/") || p.includes("/company/") || p.includes("/school/")) {
      out.linkedin = stripSocialTracking(u);
    }
  }

  if (
    !out.twitter &&
    (host === "twitter.com" || host === "x.com" || host === "mobile.twitter.com")
  ) {
    const parts = u.pathname.split("/").filter(Boolean);
    const first = parts[0]?.toLowerCase() ?? "";
    if (
      ["intent", "share", "i", "home", "search", "hashtag", "settings", "login", "signup"].includes(
        first
      )
    ) {
      return;
    }
    if (parts.length >= 1 && /^[a-z0-9_]+$/i.test(parts[0] ?? "")) {
      out.twitter = stripSocialTracking(u);
    }
  }

  if (
    !out.tiktok &&
    (host === "tiktok.com" ||
      host === "www.tiktok.com" ||
      host === "vm.tiktok.com" ||
      host === "m.tiktok.com")
  ) {
    const parts = u.pathname.split("/").filter(Boolean);
    const seg = (parts[0] ?? "").toLowerCase();
    if (["video", "discover", "tag", "music", "legal", "foryou"].includes(seg)) return;
    if (seg.startsWith("@")) {
      const handle = seg.slice(1);
      if (/^[a-z0-9._-]+$/i.test(handle)) {
        out.tiktok = stripSocialTracking(u);
      }
    }
  }

  if (
    !out.youtube &&
    (host === "youtube.com" || host === "www.youtube.com" || host === "m.youtube.com")
  ) {
    const parts = u.pathname.split("/").filter(Boolean);
    const first = (parts[0] ?? "").toLowerCase();
    if (first.startsWith("@") && /^@[\w.-]+$/i.test(first)) {
      out.youtube = stripSocialTracking(u);
    } else if (
      (first === "channel" || first === "c" || first === "user") &&
      parts.length >= 2 &&
      parts[1]
    ) {
      out.youtube = stripSocialTracking(u);
    }
  }

  if (!out.whatsapp && (host === "wa.me" || host === "www.wa.me")) {
    const digits = u.pathname.replace(/\D/g, "");
    if (digits.length >= 8 && digits.length <= 15) {
      out.whatsapp = `https://wa.me/${digits}`;
    }
  }

  /** Many SMB sites use web.whatsapp.com or api.whatsapp.com with ?phone= (Elementor, WordPress, etc.). */
  if (!out.whatsapp && (host === "api.whatsapp.com" || host === "www.api.whatsapp.com")) {
    const ph = u.searchParams.get("phone")?.replace(/\D/g, "") ?? "";
    if (ph.length >= 8 && ph.length <= 15) {
      out.whatsapp = `https://wa.me/${ph}`;
    }
  }

  if (!out.whatsapp && (host === "web.whatsapp.com" || host === "www.web.whatsapp.com")) {
    const ph = u.searchParams.get("phone")?.replace(/\D/g, "") ?? "";
    if (ph.length >= 8 && ph.length <= 15) {
      out.whatsapp = `https://wa.me/${ph}`;
    }
  }
}

/** Digits suitable for wa.me (country code included, no +). */
function waMeDigitsFromRawPhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length >= 8 && d.length <= 15) return d;
  return null;
}

/**
 * Footers often use `<a href="tel:...">WhatsApp</a>` (same number as call) instead of wa.me.
 */
function inferWhatsAppFromTelAnchors(html: string): string | null {
  const re = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const inner = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!/\bwhatsapp\b/i.test(inner)) continue;
    const rawHref = decodeHrefForUrl(m[1].trim());
    if (!/^tel:/i.test(rawHref)) continue;
    const telPart = decodeURIComponent(rawHref.slice(4).split(/[?;]/)[0] ?? "");
    const digits = waMeDigitsFromRawPhone(telPart);
    if (digits) return `https://wa.me/${digits}`;
  }
  return null;
}

/** Catch phone= in WhatsApp URLs when href is malformed or uses nonstandard quoting (best-effort). */
function extractWhatsAppUrlsFromRawHtml(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(
    /https?:\/\/(?:web\.|api\.)whatsapp\.com\/[^"'\s<>]*[?&]phone=([^"'\s&<>]+)/gi,
  )) {
    let frag = (m[1] ?? "").replace(/&#0*38;/gi, "&");
    try {
      frag = decodeURIComponent(frag);
    } catch {
      /* keep */
    }
    const digits = waMeDigitsFromRawPhone(frag);
    if (digits) out.push(`https://wa.me/${digits}`);
  }
  for (const m of html.matchAll(/https?:\/\/wa\.me\/(\d{8,15})(?:[\s"'<>/?]|$)/gi)) {
    const digits = m[1];
    if (digits && waMeDigitsFromRawPhone(digits)) out.push(`https://wa.me/${digits}`);
  }
  return out;
}

function walkLdJsonCollectSameAs(node: unknown, acc: string[]): void {
  const visit = (o: unknown): void => {
    if (o == null) return;
    if (typeof o === "string") {
      const t = o.trim();
      if (/^https?:\/\//i.test(t)) acc.push(t);
      return;
    }
    if (Array.isArray(o)) {
      o.forEach(visit);
      return;
    }
    if (typeof o !== "object") return;
    const obj = o as Record<string, unknown>;
    const sameAs = obj.sameAs;
    if (sameAs != null) {
      if (typeof sameAs === "string") {
        const t = sameAs.trim();
        if (/^https?:\/\//i.test(t)) acc.push(t);
      } else if (Array.isArray(sameAs)) {
        for (const x of sameAs) {
          if (typeof x === "string") {
            const t = x.trim();
            if (/^https?:\/\//i.test(t)) acc.push(t);
          }
        }
      }
    }
    for (const v of Object.values(obj)) visit(v);
  };
  visit(node);
}

/** Shopify / SEO themes often put Instagram only in JSON-LD `sameAs`, not in visible `<a>` markup. */
function extractSameAsHttpUrlsFromLdJson(html: string): string[] {
  const urls: string[] = [];
  const ldRe = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let lm: RegExpExecArray | null;
  while ((lm = ldRe.exec(html)) !== null) {
    try {
      const data = JSON.parse(lm[1].trim());
      walkLdJsonCollectSameAs(data, urls);
    } catch {
      /* invalid JSON-LD */
    }
  }
  return urls;
}

/**
 * Resolve anchor/link hrefs and JSON-LD `sameAs` URLs; pick one profile-style URL per network (best-effort).
 */
export function extractProspectSocialUrls(html: string, pageBaseUrl: string): ProspectSocialUrls {
  const out: ProspectSocialUrls = { ...EMPTY_PROSPECT_SOCIAL_URLS };
  let base: URL;
  try {
    base = new URL(pageBaseUrl);
  } catch {
    return out;
  }

  /** Allow `#` so `href="...?x=1&#038;y=2"` (HTML-encoded &) matches through to the closing quote. */
  const hrefRe = /href\s*=\s*["']([^"']*?)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    let raw = m[1].trim();
    if (!raw || /^javascript:/i.test(raw)) continue;
    raw = decodeHrefForUrl(raw);
    let u: URL;
    try {
      u = new URL(raw, base);
    } catch {
      continue;
    }
    applySocialUrlToProspect(out, u);
  }

  for (const raw of extractSameAsHttpUrlsFromLdJson(html)) {
    let u: URL;
    try {
      u = new URL(raw.trim(), base);
    } catch {
      continue;
    }
    applySocialUrlToProspect(out, u);
  }

  if (!out.whatsapp) {
    const fromTel = inferWhatsAppFromTelAnchors(html);
    if (fromTel) out.whatsapp = fromTel;
  }
  if (!out.whatsapp) {
    const hits = extractWhatsAppUrlsFromRawHtml(html);
    if (hits[0]) out.whatsapp = hits[0];
  }

  return out;
}
