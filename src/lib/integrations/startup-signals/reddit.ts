import { computeRedditFitScore } from "@/lib/crm/reddit-intent-signals";
import type {
  StartupSignalAdapterContext,
  StartupSignalAdapterResult,
} from "@/lib/crm/startup-signal-types";
import {
  redditGetUserAbout,
  redditSearchPosts,
  type RedditUserAbout,
} from "@/lib/integrations/reddit";
import {
  domainFromUrl,
  pickFirstUrl,
  stableId,
} from "@/lib/integrations/startup-signals/utils";

const DEFAULT_SUBREDDITS = [
  "SaaS",
  "startups",
  "indiehackers",
  "SideProject",
  "Entrepreneur",
];

export async function searchRedditStartupSignals(
  ctx: StartupSignalAdapterContext
): Promise<StartupSignalAdapterResult> {
  const query =
    ctx.filters.keywords?.slice(0, 4).join(" OR ") ||
    "looking for developer OR need developer OR MVP OR no-code";
  const res = await redditSearchPosts({
    subreddits: DEFAULT_SUBREDDITS,
    query,
    sort: "new",
    timeRange: ctx.filters.timeRange === "day" ? "day" : ctx.filters.timeRange,
    limit: ctx.filters.limit,
  });
  if (!res.ok) return { ok: false, warning: `Reddit: ${res.error}` };

  const topPosts = res.posts.slice(0, Math.min(10, ctx.filters.limit));
  const abouts = await Promise.allSettled(
    topPosts.map((p) =>
      p.author && p.author !== "[deleted]" ? redditGetUserAbout(p.author) : Promise.resolve(null)
    )
  );
  const authorByPost = new Map<string, RedditUserAbout | null>();
  topPosts.forEach((post, i) => {
    const settled = abouts[i];
    authorByPost.set(
      post.id,
      settled.status === "fulfilled" && settled.value && settled.value.ok
        ? settled.value.about
        : null
    );
  });

  return {
    ok: true,
    hits: res.posts.map((post) => {
      const about = authorByPost.get(post.id) ?? null;
      const fit = computeRedditFitScore(post, about);
      const website =
        pickFirstUrl(about?.profileDescription ?? "") ?? post.externalUrls[0] ?? post.url;
      return {
        source: "reddit",
        sourceLabel: "Reddit",
        channel: "social_intent",
        sourceItemId: post.id ?? stableId("reddit", post.permalink, post.title),
        title: post.title,
        excerpt: post.selftext || null,
        url: post.permalink,
        authorName: post.author && post.author !== "[deleted]" ? `u/${post.author}` : null,
        authorUrl:
          post.author && post.author !== "[deleted]"
            ? `https://www.reddit.com/user/${post.author}`
            : null,
        company: null,
        companyDomain: domainFromUrl(website),
        postedAt: post.createdUtc ? new Date(post.createdUtc * 1000).toISOString() : null,
        rawPayload: {
          ...post,
          redditFit: fit,
          authorAbout: about,
        },
      };
    }),
  };
}
