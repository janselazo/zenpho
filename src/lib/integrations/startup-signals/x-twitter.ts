import type {
  StartupSignalAdapterContext,
  StartupSignalAdapterResult,
} from "@/lib/crm/startup-signal-types";
import {
  contextKeywords,
  fetchJson,
  setupWarning,
  sinceDateIso,
  stableId,
} from "@/lib/integrations/startup-signals/utils";

type XRecentSearchResponse = {
  data?: {
    id: string;
    text: string;
    created_at?: string;
    author_id?: string;
  }[];
  includes?: {
    users?: { id: string; name?: string; username?: string }[];
  };
};

export async function searchXTwitterSignals(
  ctx: StartupSignalAdapterContext
): Promise<StartupSignalAdapterResult> {
  const token = process.env.X_BEARER_TOKEN?.trim();
  if (!token) return setupWarning("x_twitter", "X_BEARER_TOKEN", "X / Twitter recent search");

  const query = `${contextKeywords(ctx, "x_twitter").slice(0, 5).join(" OR ")} -is:retweet lang:en`;
  const params = new URLSearchParams({
    query,
    max_results: String(Math.min(100, Math.max(10, ctx.filters.limit))),
    "tweet.fields": "created_at,author_id,public_metrics",
    "user.fields": "name,username,url",
    expansions: "author_id",
    start_time: sinceDateIso(ctx),
  });
  const res = await fetchJson<XRecentSearchResponse>(
    `https://api.twitter.com/2/tweets/search/recent?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) return { ok: false, warning: `X / Twitter: ${res.warning}` };

  const users = new Map((res.data.includes?.users ?? []).map((u) => [u.id, u]));
  return {
    ok: true,
    hits: (res.data.data ?? []).map((tweet) => {
      const user = tweet.author_id ? users.get(tweet.author_id) : null;
      const tweetUrl = user?.username
        ? `https://x.com/${user.username}/status/${tweet.id}`
        : `https://x.com/i/web/status/${tweet.id}`;
      return {
        source: "x_twitter",
        sourceLabel: "X / Twitter",
        channel: "social_intent",
        sourceItemId: tweet.id ?? stableId("x_twitter", tweetUrl, tweet.text),
        title: tweet.text.slice(0, 120),
        excerpt: tweet.text,
        url: tweetUrl,
        authorName: user?.name ?? (user?.username ? `@${user.username}` : null),
        authorUrl: user?.username ? `https://x.com/${user.username}` : null,
        company: null,
        companyDomain: null,
        postedAt: tweet.created_at ?? null,
        rawPayload: tweet as Record<string, unknown>,
      };
    }),
  };
}
