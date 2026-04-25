import type {
  StartupSignalAdapterContext,
  StartupSignalAdapterResult,
  StartupSignalSearchResult,
  StartupSignalSource,
} from "@/lib/crm/startup-signal-types";
import { computeStartupSignalFitScore } from "@/lib/crm/startup-signal-scoring";
import { searchCrunchbaseSignals } from "@/lib/integrations/startup-signals/crunchbase";
import { searchFacebookGroupSignals } from "@/lib/integrations/startup-signals/facebook-groups";
import { searchIndieHackersSignals } from "@/lib/integrations/startup-signals/indie-hackers";
import { searchLinkedInActivitySignals } from "@/lib/integrations/startup-signals/linkedin-activity";
import { searchLinkedInPublicSignals } from "@/lib/integrations/startup-signals/linkedin-public-search";
import { searchProductHuntSignals } from "@/lib/integrations/startup-signals/product-hunt";
import { searchRedditStartupSignals } from "@/lib/integrations/startup-signals/reddit";
import { searchTechCrunchSignals } from "@/lib/integrations/startup-signals/techcrunch";
import { searchWellfoundSignals } from "@/lib/integrations/startup-signals/wellfound";
import { searchXTwitterSignals } from "@/lib/integrations/startup-signals/x-twitter";

const ADAPTERS: Record<
  StartupSignalSource,
  (ctx: StartupSignalAdapterContext) => Promise<StartupSignalAdapterResult>
> = {
  crunchbase: searchCrunchbaseSignals,
  wellfound: searchWellfoundSignals,
  product_hunt: searchProductHuntSignals,
  techcrunch: searchTechCrunchSignals,
  reddit: searchRedditStartupSignals,
  x_twitter: searchXTwitterSignals,
  linkedin_public: searchLinkedInPublicSignals,
  linkedin_activity: searchLinkedInActivitySignals,
  facebook_groups: searchFacebookGroupSignals,
  indie_hackers: searchIndieHackersSignals,
};

export const ALL_STARTUP_SIGNAL_SOURCES = Object.keys(ADAPTERS) as StartupSignalSource[];

export async function runStartupSignalSources(
  sources: StartupSignalSource[],
  ctx: StartupSignalAdapterContext
): Promise<StartupSignalSearchResult> {
  const uniqueSources = [...new Set(sources)].filter((s) => s in ADAPTERS);
  const settled = await Promise.allSettled(
    uniqueSources.map(async (source) => ({
      source,
      result: await ADAPTERS[source](ctx),
    }))
  );
  const hits = [];
  const warnings = [];
  for (const item of settled) {
    if (item.status === "rejected") {
      warnings.push({ source: "reddit" as StartupSignalSource, message: String(item.reason) });
      continue;
    }
    const { source, result } = item.value;
    if (!result.ok) {
      warnings.push({ source, message: result.warning });
      continue;
    }
    if (result.warning) warnings.push({ source, message: result.warning });
    for (const raw of result.hits) {
      hits.push({
        ...raw,
        detectedAt: ctx.now.toISOString(),
        fit: computeStartupSignalFitScore(raw),
      });
    }
  }
  hits.sort((a, b) => b.fit.score - a.fit.score);
  return { hits: hits.slice(0, ctx.filters.limit), warnings };
}
