import { redirect } from "next/navigation";
import { loadNewLeadAlertAutomation } from "@/app/(crm)/actions/lead-automation";
import NewLeadAlertAutomation from "@/components/crm/NewLeadAlertAutomation";

export const dynamic = "force-dynamic";

export default async function NewLeadAlertAutomationPage() {
  const result = await loadNewLeadAlertAutomation();
  if (result.status === "no_user") {
    redirect("/login");
  }
  if (result.status === "no_org") {
    return (
      <div className="p-8">
        <p className="text-sm text-text-secondary dark:text-zinc-400">
          Your profile has no workspace; cannot manage automations.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <NewLeadAlertAutomation
        enabled={result.enabled}
        template={result.template}
        preference={result.preference}
        profileEmail={result.profileEmail}
        profilePhone={result.profilePhone}
        canEditTemplate={result.canEditTemplate}
      />
    </div>
  );
}
