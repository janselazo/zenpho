/**
 * Reddit app-only OAuth client for the Prospecting → Reddit Communities tab.
 *
 * Uses the "client_credentials" (installed / app-only) grant — no user context,
 * so we read public posts and public `/user/{u}/about` profiles only. Reddit
 * requires a descriptive `User-Agent`; set `REDDIT_USER_AGENT` in env.
 *
 * @see https://github.com/reddit-archive/reddit/wiki/OAuth2
 */

const TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const API_BASE = "https://oauth.reddit.com";

type CachedToken = { token: string; expiresAt: number };
let tokenCache: CachedToken | null = null;

function userAgent(): string {
  return (
    process.env.REDDIT_USER_AGENT?.trim() ||
    "zenpho-prospecting/1.0 (by /u/unknown)"
  );
}

async function fetchAppToken(): Promise<
  { ok: true; token: string; expiresInSec: number } | { ok: false; error: string }
> {
  const id = process.env.REDDIT_CLIENT_ID?.trim();
  const secret = process.env.REDDIT_CLIENT_SECRET?.trim();
  if (!id || !secret) {
    return {
      ok: false,
      error:
        "Set REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET (https://www.reddit.com/prefs/apps) in .env.local.",
    };
  }

  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  let res: Response;
  try {
    res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": userAgent(),
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Reddit token request failed.",
    };
  }
  if (!res.ok) {
    const text = await res.text();
    return {
      ok: false,
      error: `Reddit token HTTP ${res.status}: ${text.slice(0, 200)}`,
    };
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) {
    return { ok: false, error: "Reddit returned no access_token." };
  }
  return {
    ok: true,
    token: json.access_token,
    expiresInSec: typeof json.expires_in === "number" ? json.expires_in : 3600,
  };
}

async function getAccessToken(): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt - 60_000 > now) {
    return { ok: true, token: tokenCache.token };
  }
  const t = await fetchAppToken();
  if (!t.ok) return t;
  tokenCache = {
    token: t.token,
    expiresAt: now + t.expiresInSec * 1000,
  };
  return { ok: true, token: t.token };
}

async function authedFetch(path: string): Promise<
  { ok: true; data: unknown } | { ok: false; error: string }
> {
  const t = await getAccessToken();
  if (!t.ok) return t;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${t.token}`,
        "User-Agent": userAgent(),
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Reddit request failed.",
    };
  }
  if (res.status === 401) {
    // token may have rotated — retry once
    tokenCache = null;
    return authedFetch(path);
  }
  if (res.status === 429) {
    return { ok: false, error: "Reddit rate limit hit — try again in a moment." };
  }
  if (!res.ok) {
    const text = await res.text();
    return {
      ok: false,
      error: `Reddit HTTP ${res.status}: ${text.slice(0, 200)}`,
    };
  }
  try {
    const data = await res.json();
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Reddit returned invalid JSON." };
  }
}

export type RedditPost = {
  id: string;
  subreddit: string;
  title: string;
  selftext: string;
  author: string;
  permalink: string;
  url: string;
  createdUtc: number;
  score: number;
  numComments: number;
  linkFlairText: string | null;
  /** URLs parsed out of `selftext` — often founder websites, project links. */
  externalUrls: string[];
};

export type RedditUserAbout = {
  username: string;
  totalKarma: number | null;
  createdUtc: number | null;
  profileDescription: string | null;
  profileUrl: string | null;
};

const URL_RE = /https?:\/\/[^\s<>\]"']+/gi;

function extractExternalUrls(text: string): string[] {
  if (!text) return [];
  const out = new Set<string>();
  const matches = text.match(URL_RE) ?? [];
  for (const raw of matches) {
    const clean = raw.replace(/[).,;!?]+$/g, "");
    if (/reddit\.com\//i.test(clean)) continue;
    if (/redd\.it\//i.test(clean)) continue;
    out.add(clean);
    if (out.size >= 5) break;
  }
  return [...out];
}

function normalizePost(raw: unknown): RedditPost | null {
  if (!raw || typeof raw !== "object") return null;
  const wrapper = raw as { kind?: string; data?: unknown };
  const src =
    (wrapper.data as Record<string, unknown> | undefined) ??
    (raw as Record<string, unknown>);
  if (!src || typeof src !== "object") return null;
  const o = src as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : null;
  const title = typeof o.title === "string" ? o.title : null;
  const subreddit = typeof o.subreddit === "string" ? o.subreddit : null;
  if (!id || !title || !subreddit) return null;
  const permalink = typeof o.permalink === "string" ? `https://www.reddit.com${o.permalink}` : "";
  const selftext = typeof o.selftext === "string" ? o.selftext : "";
  return {
    id,
    subreddit,
    title,
    selftext,
    author: typeof o.author === "string" ? o.author : "[deleted]",
    permalink,
    url: typeof o.url === "string" ? o.url : permalink,
    createdUtc: typeof o.created_utc === "number" ? o.created_utc : 0,
    score: typeof o.score === "number" ? o.score : 0,
    numComments: typeof o.num_comments === "number" ? o.num_comments : 0,
    linkFlairText: typeof o.link_flair_text === "string" ? o.link_flair_text : null,
    externalUrls: extractExternalUrls(selftext),
  };
}

export type RedditSearchArgs = {
  subreddits: string[];
  query?: string;
  sort?: "relevance" | "new" | "top" | "hot";
  timeRange?: "hour" | "day" | "week" | "month" | "year" | "all";
  limit?: number;
};

/**
 * Search posts across multiple subreddits. Results are merged and de-duplicated by id.
 * Each subreddit counts as one Reddit API call — keep subreddit list short.
 */
export async function redditSearchPosts(
  args: RedditSearchArgs
): Promise<{ ok: true; posts: RedditPost[] } | { ok: false; error: string }> {
  const subs = args.subreddits
    .map((s) => s.trim().replace(/^r\//i, ""))
    .filter(Boolean);
  if (subs.length === 0) {
    return { ok: false, error: "Pick at least one subreddit." };
  }
  const sort = args.sort ?? "new";
  const time = args.timeRange ?? "week";
  const perSub = Math.max(5, Math.min(100, args.limit ?? 25));
  const q = (args.query ?? "").trim();

  const byId = new Map<string, RedditPost>();
  let lastError: string | null = null;

  for (const sub of subs) {
    const search = new URLSearchParams({
      q: q || "*",
      restrict_sr: "on",
      sort,
      t: time,
      limit: String(perSub),
      raw_json: "1",
    });
    const path = `/r/${encodeURIComponent(sub)}/search?${search.toString()}`;
    const res = await authedFetch(path);
    if (!res.ok) {
      lastError = res.error;
      continue;
    }
    const body = res.data as {
      data?: { children?: unknown[] };
    };
    const children = body.data?.children ?? [];
    for (const c of children) {
      const post = normalizePost(c);
      if (post && !byId.has(post.id)) byId.set(post.id, post);
    }
  }

  if (byId.size === 0 && lastError) {
    return { ok: false, error: lastError };
  }
  return { ok: true, posts: [...byId.values()] };
}

export async function redditGetUserAbout(
  username: string
): Promise<{ ok: true; about: RedditUserAbout } | { ok: false; error: string }> {
  const clean = username.trim().replace(/^\/?u\//i, "");
  if (!clean || clean === "[deleted]") {
    return { ok: false, error: "Missing username." };
  }
  const res = await authedFetch(`/user/${encodeURIComponent(clean)}/about?raw_json=1`);
  if (!res.ok) return res;
  const body = res.data as { data?: Record<string, unknown> };
  const d = body.data;
  if (!d) return { ok: false, error: "No profile data." };
  const desc =
    typeof d.subreddit === "object" && d.subreddit
      ? ((d.subreddit as Record<string, unknown>).public_description as string | undefined)
      : undefined;
  const urlStr = typeof d.url === "string" ? `https://www.reddit.com${d.url}` : null;

  const about: RedditUserAbout = {
    username: clean,
    totalKarma: typeof d.total_karma === "number" ? d.total_karma : null,
    createdUtc: typeof d.created_utc === "number" ? d.created_utc : null,
    profileDescription: desc?.trim() || null,
    profileUrl: urlStr,
  };
  return { ok: true, about };
}
