import type {
  StartupSignalAdapterContext,
  StartupSignalAdapterResult,
} from "@/lib/crm/startup-signal-types";
import { setupWarning } from "@/lib/integrations/startup-signals/utils";

export async function searchLinkedInActivitySignals(
  _ctx: StartupSignalAdapterContext
): Promise<StartupSignalAdapterResult> {
  const token =
    process.env.LINKEDIN_ACCESS_TOKEN?.trim() ||
    process.env.LINKEDIN_CLIENT_ID?.trim();
  if (!token) {
    return setupWarning(
      "linkedin_activity",
      "LINKEDIN_ACCESS_TOKEN or LINKEDIN_CLIENT_ID + LINKEDIN_CLIENT_SECRET",
      "LinkedIn Activity signals"
    );
  }

  return {
    ok: false,
    warning:
      "LinkedIn profile visitors, notifications, and post engager data require approved LinkedIn partner APIs. Configure an approved LinkedIn integration before enabling this source.",
  };
}
