import { redirect } from "next/navigation";
import { loadSendGridIntegrationPage } from "@/app/(crm)/actions/sendgrid-integration";
import SendGridIntegrationSettings from "@/components/crm/SendGridIntegrationSettings";

export const dynamic = "force-dynamic";

export default async function SendGridIntegrationPage() {
  const result = await loadSendGridIntegrationPage();
  if (result.status === "no_user") {
    redirect("/login");
  }
  if (result.status === "forbidden") {
    return (
      <div className="p-8">
        <p className="text-sm text-text-secondary dark:text-zinc-400">
          This page is only available to agency staff.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <SendGridIntegrationSettings
        initial={result.initial}
        inboundWebhookUrl={result.inboundWebhookUrl}
      />
    </div>
  );
}
