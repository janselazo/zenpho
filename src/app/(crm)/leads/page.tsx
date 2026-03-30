import LeadsView from "@/components/crm/LeadsView";
import { fetchClientsForClientsView } from "@/lib/crm/fetch-clients-for-view";
import { fetchDealsForDealsView } from "@/lib/crm/fetch-deals-for-view";
import { fetchLeadsForDealPicker } from "@/lib/crm/fetch-leads-for-deal-picker";
import { fetchCrmPipelineSettings } from "@/lib/crm/fetch-pipeline-settings";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <h1 className="heading-display text-2xl font-bold">Leads</h1>
        <p className="mt-2 text-text-secondary">Configure Supabase to load CRM.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const [
    leadsRes,
    pipeline,
    dealsForTab,
    leadPickerOptions,
    clientsPack,
  ] = await Promise.all([
    supabase
      .from("lead")
      .select(
        "id, name, email, phone, company, stage, source, notes, project_type, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(200),
    fetchCrmPipelineSettings(),
    fetchDealsForDealsView(),
    fetchLeadsForDealPicker(),
    fetchClientsForClientsView(),
  ]);

  const { data: leads, error } = leadsRes;

  const leadRows = leads ?? [];
  const leadIds = leadRows.map((l) => l.id);
  const dealByLeadId = new Map<
    string,
    { id: string; title: string | null }
  >();
  if (leadIds.length > 0) {
    const { data: dealRows } = await supabase
      .from("deal")
      .select("id, lead_id, title, updated_at")
      .in("lead_id", leadIds)
      .order("updated_at", { ascending: false });
    for (const row of dealRows ?? []) {
      if (!dealByLeadId.has(row.lead_id)) {
        dealByLeadId.set(row.lead_id, {
          id: row.id,
          title: row.title,
        });
      }
    }
  }

  const leadsWithDeals = leadRows.map((l) => ({
    ...l,
    deal: dealByLeadId.get(l.id) ?? null,
  }));

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
          leads={leadsWithDeals}
          leadPipelineColumns={pipeline.lead}
          dealPipelineColumns={pipeline.deal}
          dealsForTab={dealsForTab}
          dealLeadPickerOptions={leadPickerOptions}
          clientsForTab={clientsForTab}
          clientsTabLoadError={clientsPack.error}
        />
      )}
    </div>
  );
}
