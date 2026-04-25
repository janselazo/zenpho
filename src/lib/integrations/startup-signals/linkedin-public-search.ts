import type {
  StartupSignalAdapterContext,
  StartupSignalAdapterResult,
} from "@/lib/crm/startup-signal-types";
import { serperSearchSignals } from "@/lib/integrations/startup-signals/serper";

export function searchLinkedInPublicSignals(
  ctx: StartupSignalAdapterContext
): Promise<StartupSignalAdapterResult> {
  return serperSearchSignals({
    source: "linkedin_public",
    channel: "social_intent",
    ctx,
    site: "linkedin.com/posts OR site:linkedin.com/feed/update",
    querySuffix: "founder startup",
  });
}
