/**
 * MVP handoff links for Messenger / Instagram (open + paste message in product UI).
 * Phase 2: server-sent DMs need Meta Messenger Platform / Instagram Messaging API or Twilio Conversations—not URL handoff alone.
 */

export function messengerHandoffUrlFromFacebook(facebookUrl: string): string | null {
  const raw = facebookUrl.trim();
  if (!raw) return null;
  try {
    const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(href);
    const host = u.hostname.replace(/^www\./i, "");
    if (host === "m.me") {
      return u.toString();
    }
    if (!host.endsWith("facebook.com") && !host.endsWith("fb.com")) {
      return href;
    }
    const parts = u.pathname.split("/").filter(Boolean);
    const first = parts[0]?.toLowerCase() ?? "";
    const skip = new Set([
      "sharer",
      "share",
      "groups",
      "events",
      "watch",
      "people",
      "profile.php",
      "pages",
    ]);
    if (!first || skip.has(first)) {
      return href;
    }
    return `https://m.me/${parts[0]}`;
  } catch {
    return null;
  }
}

export function instagramProfileUrl(instagramUrl: string): string | null {
  const raw = instagramUrl.trim();
  if (!raw) return null;
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).toString();
  } catch {
    return null;
  }
}
