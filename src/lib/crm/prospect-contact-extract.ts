/**
 * Parse public contact signals from HTML (mailto, tel, JSON-LD). Used for prospect enrichment.
 */

const JUNK_LOCAL = /^no-?reply|^donotreply|^mailer-daemon|^postmaster|^bounce/i;

function junkDomain(dom: string): boolean {
  const d = dom.toLowerCase();
  return (
    d.endsWith("sentry.io") ||
    d.endsWith("wixpress.com") ||
    d.endsWith("cloudflare.com") ||
    d === "google.com" ||
    d === "facebook.com" ||
    d === "gmail.com"
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

export function extractPublicContactHints(html: string): {
  emails: string[];
  phones: string[];
  founderName: string | null;
} {
  const emails = new Set<string>();
  const phones = new Set<string>();
  let founderName: string | null = null;

  for (const m of html.matchAll(/mailto:([^\s'"<>]+)/gi)) {
    const addr = decodeURIComponent(m[1].split("?")[0]).trim();
    if (addr && !isJunkEmail(addr)) emails.add(addr.toLowerCase());
  }
  for (const m of html.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)) {
    const e = m[0];
    if (!isJunkEmail(e)) emails.add(e.toLowerCase());
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

const CONTACT_PATH = /\/(contact|contact-us|about|about-us|team|location|locations)(\/|$|\?)/i;
const CONTACT_HINT = /contact|about|team|location|kontakt|contatti/i;

/** Same registrable host only; scored internal links for contact-style pages. */
export function discoverContactPageUrls(html: string, baseUrl: string, max = 5): string[] {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return [];
  }
  const host = base.hostname.replace(/^www\./i, "");
  const seen = new Set<string>();
  const scored: { url: string; score: number }[] = [];

  const re = /<a\s[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
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
    if (CONTACT_PATH.test(path + abs.search)) score += 4;
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

function emailRankScore(email: string): number {
  const local = email.split("@")[0] || "";
  if (/^(contact|info|hello|office|sales|support|admin|team)\b/i.test(local)) return 100;
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
