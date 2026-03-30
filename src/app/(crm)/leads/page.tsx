import LeadsView from "@/components/crm/LeadsView";
import { fetchClientsForClientsView } from "@/lib/crm/fetch-clients-for-view";
import { fetchCrmPipelineSettings } from "@/lib/crm/fetch-pipeline-settings";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const LEADS_SECTIONS = ["pipeline", "leads", "clients"] as const;
type LeadsSectionQuery = (typeof LEADS_SECTIONS)[number];

function parseLeadsSection(
  raw: string | string[] | undefined
): LeadsSectionQuery | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "pipeline" || v === "leads" || v === "clients") {
    return v;
  }
  /** Legacy `?section=deals` (removed tab) → pipeline */
  if (v === "deals") return "pipeline";
  return undefined;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string | string[] }>;
}) {
  const sp = await searchParams;
  const initialSection = parseLeadsSection(sp.section);
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <h1 className="heading-display text-2xl font-bold">Leads</h1>
        <p className="mt-2 text-text-secondary">Configure Supabase to load CRM.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const [leadsRes, pipeline, clientsPack] = await Promise.all([
    supabase
      .from("lead")
      .select(
        "id, name, email, phone, company, stage, source, notes, project_type, created_at, converted_client_id"
      )
      .order("created_at", { ascending: false })
      .limit(200),
    fetchCrmPipelineSettings(),
    fetchClientsForClientsView(),
  ]);

  const { data: leads, error } = leadsRes;

  const leadRows = leads ?? [];
  const clientIds = [
    ...new Set(
      leadRows
        .map((l) => l.converted_client_id as string | null)
        .filter((id): id is string => Boolean(id?.trim()))
    ),
  ];

  const primaryProjectByClientId = new Map<
    string,
    { title: string | null }
  >();
  if (clientIds.length > 0) {
    const { data: projRows } = await supabase
      .from("project")
      .select("client_id, title, created_at")
      .in("client_id", clientIds)
      .order("created_at", { ascending: false });
    for (const row of projRows ?? []) {
      const cid = row.client_id as string;
      if (!primaryProjectByClientId.has(cid)) {
        primaryProjectByClientId.set(cid, {
          title: (row.title as string | null) ?? null,
        });
      }
    }
  }

  const leadsForView = leadRows.map((l) => {
    const cid = (l.converted_client_id as string | null)?.trim() ?? null;
    return {
      ...l,
      primaryProject:
        cid && primaryProjectByClientId.has(cid)
          ? primaryProjectByClientId.get(cid)!
          : null,
    };
  });

  const clientsForTab = clientsPack.error ? [] : clientsPack.rows;

  return (
    <div className="p-8">
      {error ? (
        <div>
          <h1 className="heading-display text-2xl font-bold text-text-primary">
            Leads
          </h1>
          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
            {error.message}. Apply{" "}
            <code className="font-mono text-xs">supabase/migrations</code>.
          </p>
        </div>
      ) : (
        <LeadsView
          leads={leadsForView}
          leadPipelineColumns={pipeline.lead}
          clientsForTab={clientsForTab}
          clientsTabLoadError={clientsPack.error}
          initialSection={initialSection}
        />
      )}
    </div>
  );
}
