/**
 * Parse Instagram profile URLs and contact signals from plain bio text (e.g. server-fetched HTML parse).
 */

import { isJunkEmail, rankEmailsUnique } from "@/lib/crm/prospect-contact-extract";

const IG_RESERVED_FIRST_SEGMENT = new Set([
  "",
  "p",
  "reel",
  "reels",
  "stories",
  "explore",
  "accounts",
  "direct",
  "tv",
  "privacy",
  "legal",
  "about",
  "developer",
  "help",
]);

export type ParsedInstagramUrl =
  | { ok: true; handle: string; profileUrl: string }
  | { ok: false; error: string };

/** Accept profile URL or @handle. Reject posts/reels/etc. */
export function parseInstagramProfileUrl(raw: string): ParsedInstagramUrl {
  const s = raw.trim();
  if (!s) {
    return { ok: false, error: "Enter an Instagram profile URL or @handle." };
  }

  if (s.startsWith("@")) {
    const h = s
      .slice(1)
      .split("/")[0]
      ?.trim()
      .replace(/^@+/, "");
    if (!h || !/^[a-z0-9._]{1,30}$/i.test(h)) {
      return { ok: false, error: "Invalid Instagram handle." };
    }
    const handle = h.toLowerCase();
    return {
      ok: true,
      handle,
      profileUrl: `https://www.instagram.com/${encodeURIComponent(handle)}/`,
    };
  }

  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    if (host !== "instagram.com") {
      return { ok: false, error: "URL must be an instagram.com profile." };
    }
    const parts = u.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    if (parts.length !== 1) {
      return {
        ok: false,
        error: "Use a profile link like instagram.com/username (not a post or reel).",
      };
    }
    const seg = parts[0].toLowerCase();
    if (IG_RESERVED_FIRST_SEGMENT.has(seg)) {
      return { ok: false, error: "That path is not a profile page." };
    }
    const handle = parts[0];
    if (!/^[a-z0-9._]{1,30}$/i.test(handle)) {
      return { ok: false, error: "Invalid profile username in URL." };
    }
    const h = handle.toLowerCase();
    return {
      ok: true,
      handle: h,
      profileUrl: `https://www.instagram.com/${encodeURIComponent(h)}/`,
    };
  } catch {
    return { ok: false, error: "Invalid URL." };
  }
}

function stripTrailingPunct(url: string): string {
  return url.replace(/[.,;:!?)'\]]+$/g, "");
}

function extractUrlsFromPlainText(text: string): string[] {
  const urls: string[] = [];
  for (const m of text.matchAll(/https?:\/\/[^\s<>"')\]]+/gi)) {
    urls.push(stripTrailingPunct(m[0]));
  }
  for (const m of text.matchAll(/\bwww\.[^\s<>"')\]]+/gi)) {
    urls.push(stripTrailingPunct(`https://${m[0]}`));
  }
  return [...new Set(urls)];
}

function extractPhonesFromPlainText(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\+?\d[\d\s().-]{8,}\d/g)) {
    const rawDigits = m[0].replace(/[^\d+]/g, "");
    const hasPlus = rawDigits.startsWith("+");
    const digits = hasPlus ? rawDigits.slice(1) : rawDigits;
    if (digits.length >= 10) {
      out.push(hasPlus ? `+${digits}` : digits);
    }
  }
  return [...new Set(out)];
}

function extractEmailsFromPlainText(text: string): string[] {
  const emails = new Set<string>();
  for (const m of text.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)) {
    const e = m[0];
    if (!isJunkEmail(e)) emails.add(e.toLowerCase());
  }
  return rankEmailsUnique([...emails]);
}

function isInstagramHost(host: string): boolean {
  return host === "instagram.com" || host.endsWith(".instagram.com");
}

/** First non-Instagram http(s) URL, for “website” in notes. */
export function pickExternalWebsiteUrl(urls: string[]): string | null {
  for (const u of urls) {
    try {
      const host = new URL(u).hostname.replace(/^www\./i, "").toLowerCase();
      if (!isInstagramHost(host)) return u;
    } catch {
      continue;
    }
  }
  return null;
}

export type InstagramContactSignals = {
  emails: string[];
  phones: string[];
  urls: string[];
  website: string | null;
};

export function extractContactSignalsFromPlainText(text: string): InstagramContactSignals {
  const urls = extractUrlsFromPlainText(text);
  return {
    emails: extractEmailsFromPlainText(text),
    phones: extractPhonesFromPlainText(text),
    urls,
    website: pickExternalWebsiteUrl(urls),
  };
}

/** First bio line that looks like a human name, else @handle. */
export function suggestedDisplayName(handle: string, bio: string): string {
  const lines = bio
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines) {
    if (line.length > 80) continue;
    if (/^https?:\/\//i.test(line) || /^www\./i.test(line)) continue;
    if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(line)) continue;
    if (/^\d[\d\s().-]{8,}\d$/.test(line.replace(/\s/g, ""))) continue;
    if (/^[✉️📧📱🔗👉👇|•·\-–—]+$/u.test(line)) continue;
    return line.slice(0, 120);
  }
  return `@${handle}`;
}

export function buildInstagramLeadNotes(input: {
  profileUrl: string;
  handle: string;
  bio: string;
  signals: InstagramContactSignals;
  /** Default manual — set to "fetched" when bio came from server-side HTML parse. */
  bioSource?: "manual" | "fetched";
}): string {
  const lines: string[] = [];
  lines.push(`Instagram: ${input.profileUrl}`, `Handle: @${input.handle}`, "");
  if (input.signals.website) {
    lines.push(`Website: ${input.signals.website}`, "");
  }
  const bioHeading =
    input.bioSource === "fetched" ? "Bio (fetched from public profile HTML)" : "Bio (pasted)";
  lines.push(bioHeading, input.bio.trim() || "(empty)", "");
  if (input.signals.emails.length) {
    lines.push("Emails detected", ...input.signals.emails.map((e) => `- ${e}`), "");
  }
  if (input.signals.phones.length) {
    lines.push("Phones detected", ...input.signals.phones.map((p) => `- ${p}`), "");
  }
  if (input.signals.urls.length && input.signals.urls.some((u) => u !== input.signals.website)) {
    const extra = input.signals.urls.filter((u) => u !== input.signals.website);
    if (extra.length) {
      lines.push("Other links", ...extra.map((u) => `- ${u}`));
    }
  }
  return lines.join("\n").trim();
}
