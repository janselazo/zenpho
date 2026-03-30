import ClientsView from "@/components/crm/ClientsView";
import { fetchClientsForClientsView } from "@/lib/crm/fetch-clients-for-view";
import { isSupabaseConfigured } from "@/lib/supabase/config";

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

  const { rows, error } = await fetchClientsForClientsView();

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
