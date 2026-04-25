import type {
  StartupSignalAdapterContext,
  StartupSignalAdapterResult,
  StartupSignalChannel,
  StartupSignalHit,
  StartupSignalSource,
} from "@/lib/crm/startup-signal-types";
import {
  contextKeywords,
  domainFromUrl,
  fetchJson,
  setupWarning,
  stableId,
} from "@/lib/integrations/startup-signals/utils";

type SerperResponse = {
  organic?: {
    title?: string;
    link?: string;
    snippet?: string;
    date?: string;
  }[];
};

type RawStartupSignalHit = Omit<StartupSignalHit, "fit" | "detectedAt">;

const SOURCE_LABELS: Record<StartupSignalSource, string> = {
  crunchbase: "Crunchbase",
  wellfound: "Wellfound",
  product_hunt: "Product Hunt",
  techcrunch: "TechCrunch",
  reddit: "Reddit",
  x_twitter: "X / Twitter",
  linkedin_public: "LinkedIn public search",
  linkedin_activity: "LinkedIn Activity",
  facebook_groups: "Facebook Groups",
  indie_hackers: "Indie Hackers",
};

export async function serperSearchSignals(args: {
  source: StartupSignalSource;
  channel: StartupSignalChannel;
  ctx: StartupSignalAdapterContext;
  site?: string;
  queryPrefix?: string;
  querySuffix?: string;
}): Promise<StartupSignalAdapterResult> {
  const key = process.env.SERPER_API_KEY?.trim();
  if (!key) return setupWarning(args.source, "SERPER_API_KEY", SOURCE_LABELS[args.source]);

  const keywords = contextKeywords(args.ctx, args.source).slice(0, 4);
  const queries = keywords.map((keyword) =>
    [
      args.queryPrefix,
      args.site ? `site:${args.site}` : null,
      keyword,
      args.querySuffix,
    ]
      .filter(Boolean)
      .join(" ")
  );

  const responses = await Promise.all(
    queries.map((q) =>
      fetchJson<SerperResponse>("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q,
          num: Math.min(10, args.ctx.filters.limit),
        }),
      })
    )
  );

  const seen = new Set<string>();
  const out: RawStartupSignalHit[] = [];
  const warnings: string[] = [];

  for (const res of responses) {
    if (!res.ok) {
      warnings.push(res.warning);
      continue;
    }
    for (const item of res.data.organic ?? []) {
      const url = item.link?.trim();
      const title = item.title?.trim();
      if (!url || !title || seen.has(url)) continue;
      seen.add(url);
      out.push({
        source: args.source,
        sourceLabel: SOURCE_LABELS[args.source],
        channel: args.channel,
        sourceItemId: stableId(args.source, url, title),
        title,
        excerpt: item.snippet?.trim() || null,
        url,
        authorName: null,
        authorUrl: null,
        company: null,
        companyDomain: domainFromUrl(url),
        postedAt: item.date ? new Date(item.date).toISOString() : null,
        rawPayload: item as Record<string, unknown>,
      });
    }
  }

  return {
    ok: true,
    hits: out.slice(0, args.ctx.filters.limit),
    warning: warnings[0],
  };
}
