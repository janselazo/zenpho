import ClientsView from "@/components/crm/ClientsView";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <h1 className="heading-display text-2xl font-bold">Clients</h1>
        <p className="mt-2 text-text-secondary">Configure Supabase to load CRM.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const [clientsRes, leadsRes, dealsRes] = await Promise.all([
    supabase
      .from("client")
      .select("id, name, email, phone, company, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("lead")
      .select(
        "id, name, email, company, source, converted_client_id, created_at"
      )
      .not("converted_client_id", "is", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("deal")
      .select("title, lead_id, updated_at")
      .order("updated_at", { ascending: false })
      .limit(500),
  ]);

  const { data: clients, error } = clientsRes;

  const leadByClientId = new Map<
    string,
    {
      id: string;
      name: string | null;
      email: string | null;
      company: string | null;
      source: string | null;
    }
  >();
  for (const row of leadsRes.data ?? []) {
    const cid = row.converted_client_id as string | null;
    if (!cid || leadByClientId.has(cid)) continue;
    leadByClientId.set(cid, {
      id: row.id,
      name: row.name,
      email: row.email,
      company: row.company,
      source: row.source,
    });
  }

  /** First non-empty title per lead, preferring most recently updated deals. */
  const dealTitleByLeadId = new Map<string, string>();
  for (const row of dealsRes.data ?? []) {
    const lid = row.lead_id as string | null;
    if (!lid || dealTitleByLeadId.has(lid)) continue;
    const t = (row.title ?? "").trim();
    if (!t) continue;
    dealTitleByLeadId.set(lid, t);
  }

  const rows =
    clients?.map((c) => {
      const linkedLead = leadByClientId.get(c.id) ?? null;
      const dealName = linkedLead
        ? (dealTitleByLeadId.get(linkedLead.id) ?? null)
        : null;
      return {
        ...c,
        linkedLead,
        dealName,
      };
    }) ?? [];

  return (
    <div className="p-8">
      <div>
        <h1 className="heading-display text-2xl font-bold text-text-primary">
          Clients
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Companies and contacts you work with
        </p>
      </div>

      {error ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          {error.message}. Apply{" "}
          <code className="font-mono text-xs">supabase/migrations</code>.
        </p>
      ) : (
        <ClientsView clients={rows} />
      )}
    </div>
  );
}
