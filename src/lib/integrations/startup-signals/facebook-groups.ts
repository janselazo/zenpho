import type {
  StartupSignalAdapterContext,
  StartupSignalAdapterResult,
  StartupSignalHit,
} from "@/lib/crm/startup-signal-types";
import {
  fetchJson,
  setupWarning,
  stableId,
} from "@/lib/integrations/startup-signals/utils";

type MetaGroupFeedResponse = {
  data?: {
    id: string;
    message?: string;
    permalink_url?: string;
    created_time?: string;
    from?: { name?: string; id?: string };
  }[];
};

type RawStartupSignalHit = Omit<StartupSignalHit, "fit" | "detectedAt">;

export async function searchFacebookGroupSignals(
  ctx: StartupSignalAdapterContext
): Promise<StartupSignalAdapterResult> {
  const token = process.env.META_GRAPH_ACCESS_TOKEN?.trim();
  const groupIds = process.env.META_GROUP_IDS?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
  if (!token || groupIds.length === 0) {
    return setupWarning(
      "facebook_groups",
      "META_GRAPH_ACCESS_TOKEN + META_GROUP_IDS",
      "Facebook Groups signals"
    );
  }

  const words = (ctx.filters.keywords?.length
    ? ctx.filters.keywords
    : ["developer", "agency", "MVP", "technical cofounder"]
  ).map((w) => w.toLowerCase());

  const responses = await Promise.all(
    groupIds.slice(0, 5).map((groupId) => {
      const params = new URLSearchParams({
        access_token: token,
        fields: "id,message,permalink_url,created_time,from",
        limit: String(Math.min(25, ctx.filters.limit)),
      });
      return fetchJson<MetaGroupFeedResponse>(
        `https://graph.facebook.com/v19.0/${encodeURIComponent(groupId)}/feed?${params.toString()}`
      );
    })
  );

  const hits: RawStartupSignalHit[] = [];
  const warnings: string[] = [];
  for (const response of responses) {
    if (!response.ok) {
      warnings.push(response.warning);
      continue;
    }
    for (const post of response.data.data ?? []) {
      const message = post.message?.trim() ?? "";
      if (!message || !words.some((word) => message.toLowerCase().includes(word))) continue;
      const url = post.permalink_url ?? "https://www.facebook.com/groups/";
      hits.push({
        source: "facebook_groups",
        sourceLabel: "Facebook Groups",
        channel: "social_intent",
        sourceItemId: post.id ?? stableId("facebook_groups", url, message),
        title: message.slice(0, 120),
        excerpt: message,
        url,
        authorName: post.from?.name ?? null,
        authorUrl: post.from?.id ? `https://www.facebook.com/${post.from.id}` : null,
        company: null,
        companyDomain: null,
        postedAt: post.created_time ?? null,
        rawPayload: post as Record<string, unknown>,
      });
    }
  }
  return { ok: true, hits: hits.slice(0, ctx.filters.limit), warning: warnings[0] };
}
