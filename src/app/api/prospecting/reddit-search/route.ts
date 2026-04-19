import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  redditGetUserAbout,
  redditSearchPosts,
  type RedditPost,
  type RedditUserAbout,
} from "@/lib/integrations/reddit";
import {
  computeRedditFitScore,
  filterPatternForIntents,
  type IntentKey,
  type RedditFitScore,
} from "@/lib/crm/reddit-intent-signals";

export const runtime = "nodejs";

const MAX_SUBREDDITS = 6;
const MAX_AUTHOR_LOOKUPS = 15;

type SearchBody = {
  subreddits?: string[];
  query?: string;
  intents?: IntentKey[];
  timeRange?: "day" | "week" | "month" | "year" | "all";
  sort?: "relevance" | "new" | "top" | "hot";
  limit?: number;
  /** When true, resolves `/user/{u}/about` for top authors (slower, but better scoring). */
  enrichAuthors?: boolean;
};

export type RedditSearchResult = {
  post: RedditPost;
  author: RedditUserAbout | null;
  fit: RedditFitScore;
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized", results: [] }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "agency_admin" && profile?.role !== "agency_member") {
    return NextResponse.json({ error: "Forbidden", results: [] }, { status: 403 });
  }

  let body: SearchBody;
  try {
    body = (await req.json()) as SearchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON", results: [] }, { status: 400 });
  }

  const subreddits = Array.isArray(body.subreddits)
    ? body.subreddits
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .slice(0, MAX_SUBREDDITS)
    : [];
  if (subreddits.length === 0) {
    return NextResponse.json(
      { error: "Pick at least one subreddit.", results: [] },
      { status: 400 }
    );
  }

  const searchRes = await redditSearchPosts({
    subreddits,
    query: body.query,
    sort: body.sort ?? "new",
    timeRange: body.timeRange ?? "week",
    limit: typeof body.limit === "number" ? body.limit : 25,
  });

  if (!searchRes.ok) {
    return NextResponse.json(
      { results: [], warning: searchRes.error },
      { status: 200 }
    );
  }

  let posts = searchRes.posts;

  // Optional pre-filter: intent patterns applied to title+body, before author enrichment.
  const intents = Array.isArray(body.intents)
    ? (body.intents.filter(
        (v): v is IntentKey =>
          v === "needs_dev" ||
          v === "no_code_built" ||
          v === "mvp_early" ||
          v === "show_build"
      ) as IntentKey[])
    : [];
  const intentPattern = filterPatternForIntents(intents);
  if (intentPattern) {
    posts = posts.filter((p) =>
      intentPattern.test(`${p.title}\n${p.selftext}${p.linkFlairText ? `\n${p.linkFlairText}` : ""}`)
    );
  }

  // Score without author enrichment first so we can pick the top candidates.
  const preScored = posts.map((post) => ({
    post,
    fit: computeRedditFitScore(post, null),
  }));
  preScored.sort((a, b) => b.fit.score - a.fit.score);

  const authorByName = new Map<string, RedditUserAbout | null>();
  if (body.enrichAuthors) {
    const uniqueAuthors: string[] = [];
    for (const row of preScored) {
      const name = row.post.author;
      if (!name || name === "[deleted]" || authorByName.has(name)) continue;
      uniqueAuthors.push(name);
      authorByName.set(name, null);
      if (uniqueAuthors.length >= MAX_AUTHOR_LOOKUPS) break;
    }
    const abouts = await Promise.allSettled(
      uniqueAuthors.map((n) => redditGetUserAbout(n))
    );
    uniqueAuthors.forEach((n, i) => {
      const r = abouts[i];
      if (r.status === "fulfilled" && r.value.ok) {
        authorByName.set(n, r.value.about);
      }
    });
  }

  const results: RedditSearchResult[] = preScored.map(({ post }) => {
    const about = authorByName.get(post.author) ?? null;
    return {
      post,
      author: about,
      fit: computeRedditFitScore(post, about),
    };
  });

  results.sort((a, b) => b.fit.score - a.fit.score);

  return NextResponse.json({ results });
}
