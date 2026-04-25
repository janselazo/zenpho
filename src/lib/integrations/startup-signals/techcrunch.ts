import type {
  StartupSignalAdapterContext,
  StartupSignalAdapterResult,
} from "@/lib/crm/startup-signal-types";
import {
  domainFromUrl,
  fetchText,
  stableId,
} from "@/lib/integrations/startup-signals/utils";
import { serperSearchSignals } from "@/lib/integrations/startup-signals/serper";

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export async function searchTechCrunchSignals(
  ctx: StartupSignalAdapterContext
): Promise<StartupSignalAdapterResult> {
  const rss = await fetchText("https://techcrunch.com/feed/");
  if (!rss.ok) {
    return serperSearchSignals({
      source: "techcrunch",
      channel: "launches",
      ctx,
      site: "techcrunch.com",
      querySuffix: "startup funding launch",
    });
  }

  const items = [...rss.text.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, ctx.filters.limit);
  const keywords = (ctx.filters.keywords?.length ? ctx.filters.keywords : ["startup", "funding", "launch"]).map((k) =>
    k.toLowerCase()
  );

  return {
    ok: true,
    hits: items.flatMap((m) => {
      const item = m[1];
      const title = decodeXml(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").trim();
      const url = decodeXml(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "").trim();
      const description = decodeXml(item.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "")
        .replace(/<[^>]+>/g, "")
        .trim();
      const pubDate = decodeXml(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "").trim();
      const haystack = `${title}\n${description}`.toLowerCase();
      if (!title || !url || !keywords.some((kw) => haystack.includes(kw.toLowerCase()))) return [];
      return [
        {
          source: "techcrunch",
          sourceLabel: "TechCrunch",
          channel: "launches",
          sourceItemId: stableId("techcrunch", url, title),
          title,
          excerpt: description || null,
          url,
          authorName: null,
          authorUrl: null,
          company: null,
          companyDomain: domainFromUrl(url),
          postedAt: pubDate ? new Date(pubDate).toISOString() : null,
          rawPayload: { title, url, description, pubDate },
        },
      ];
    }),
  };
}
