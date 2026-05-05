import AgencyDocsHub from "@/components/crm/agency-docs/AgencyDocsHub";

export const dynamic = "force-dynamic";

/** CRM industries workspace — lives under `/docs/industries` so `/industries` stays marketing-only. */
export default async function IndustriesHubPage() {
  return (
    <AgencyDocsHub
      docTypes={["industry"]}
      heading="Industries"
      subtitle="Research, playbooks, and notes organized by industry vertical."
      hubBasePath="/docs/industries"
    />
  );
}
