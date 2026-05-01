import AgencyDocsHub from "@/components/crm/agency-docs/AgencyDocsHub";

export const dynamic = "force-dynamic";

export default async function IndustriesHubPage() {
  return (
    <AgencyDocsHub
      docType="industry"
      heading="Industries"
      subtitle="Research, playbooks, and notes organized by industry vertical."
      basePath="/agency/industries"
    />
  );
}
