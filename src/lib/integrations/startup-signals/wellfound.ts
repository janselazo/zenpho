import type {
  StartupSignalAdapterContext,
  StartupSignalAdapterResult,
} from "@/lib/crm/startup-signal-types";
import { serperSearchSignals } from "@/lib/integrations/startup-signals/serper";

export async function searchWellfoundSignals(
  ctx: StartupSignalAdapterContext
): Promise<StartupSignalAdapterResult> {
  const configured = process.env.WELLFOUND_API_KEY?.trim();
  const res = await serperSearchSignals({
    source: "wellfound",
    channel: "funding",
    ctx,
    site: "wellfound.com/company",
    querySuffix: "startup founder hiring MVP",
  });
  if (res.ok && configured && res.warning) {
    return { ...res, warning: `Wellfound API key detected; using public search fallback. ${res.warning}` };
  }
  return res.ok
    ? {
        ...res,
        warning:
          res.warning ??
          "Wellfound public API access is limited; results use SERPER_API_KEY public search fallback.",
      }
    : res;
}
