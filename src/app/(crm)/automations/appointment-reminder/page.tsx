import { redirect } from "next/navigation";
import { loadAppointmentReminderAutomation } from "@/app/(crm)/actions/appointment-reminder-automation";
import AppointmentReminderAutomation from "@/components/crm/AppointmentReminderAutomation";

export const dynamic = "force-dynamic";

export default async function AppointmentReminderAutomationPage() {
  const result = await loadAppointmentReminderAutomation();
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
      <AppointmentReminderAutomation
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
