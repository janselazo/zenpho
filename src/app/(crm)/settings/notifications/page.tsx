import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// The notifications editor moved to /automations/new-lead-alert when Lead
// notifications became a real Automation flow. Keep this redirect so any
// existing bookmarks land in the new home.
export default function LegacyLeadNotificationsRedirect() {
  redirect("/automations/new-lead-alert");
}
