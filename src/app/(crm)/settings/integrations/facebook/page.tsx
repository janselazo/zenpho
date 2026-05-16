import { redirect } from "next/navigation";
import { loadFacebookIntegrationPage } from "@/app/(crm)/actions/facebook-integration";
import FacebookIntegrationSettings from "@/components/crm/FacebookIntegrationSettings";

export const dynamic = "force-dynamic";

export default async function FacebookIntegrationPage() {
  const result = await loadFacebookIntegrationPage();
  if (result.status === "no_user") {
    redirect("/login");
  }
  if (result.status === "forbidden" || result.status === "no_org") {
    return (
      <div className="p-8">
        <p className="text-sm text-text-secondary dark:text-zinc-400">
          {result.status === "forbidden"
            ? "Only Admins or Super Admins can configure the Facebook integration."
            : "Your profile has no workspace; cannot configure integrations."}
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <FacebookIntegrationSettings
        initial={result.integration}
        pages={result.pages}
        owners={result.owners}
        webhookUrl={result.webhookUrl}
        events={result.events}
        forms={result.forms}
        integrationKeyConfigured={result.integrationKeyConfigured}
      />
    </div>
  );
}
