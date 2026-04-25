import type {
  StartupSignalAdapterContext,
  StartupSignalAdapterResult,
} from "@/lib/crm/startup-signal-types";
import { serperSearchSignals } from "@/lib/integrations/startup-signals/serper";

export function searchIndieHackersSignals(
  ctx: StartupSignalAdapterContext
): Promise<StartupSignalAdapterResult> {
  return serperSearchSignals({
    source: "indie_hackers",
    channel: "social_intent",
    ctx,
    site: "indiehackers.com",
    querySuffix: "founder MVP no-code developer",
  });
}
