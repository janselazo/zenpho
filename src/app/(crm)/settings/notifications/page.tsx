import { redirect } from "next/navigation";
import { loadLeadNotificationsPage } from "@/app/(crm)/actions/lead-notifications";
import LeadNotificationSettings from "@/components/crm/LeadNotificationSettings";

export const dynamic = "force-dynamic";

export default async function LeadNotificationsPage() {
  const result = await loadLeadNotificationsPage();
  if (result.status === "no_user") {
    redirect("/login");
  }
  if (result.status === "no_org") {
    return (
      <div className="p-8">
        <p className="text-sm text-text-secondary dark:text-zinc-400">
          Your profile has no workspace; cannot manage notifications.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <LeadNotificationSettings
        preference={result.preference}
        template={result.template}
        canEditTemplate={result.canEditTemplate}
        profileEmail={result.profileEmail}
      />
    </div>
  );
}
