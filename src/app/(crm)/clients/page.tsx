import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function ClientsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <h1 className="heading-display text-2xl font-bold">Clients</h1>
        <p className="mt-2 text-text-secondary">Configure Supabase first.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: clients, error } = await supabase
    .from("client")
    .select("id, name, email, company, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <h1 className="heading-display text-2xl font-bold text-text-primary">
        Clients
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        Companies and contacts you work with
      </p>

      {error ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          {error.message}
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-border rounded-2xl border border-border bg-white">
          {(clients ?? []).length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-text-secondary">
              No clients yet.
            </li>
          ) : (
            (clients ?? []).map((c) => (
              <li key={c.id} className="px-4 py-4">
                <p className="font-medium text-text-primary">{c.name}</p>
                <p className="text-sm text-text-secondary">
                  {c.email} {c.company ? `· ${c.company}` : ""}
                </p>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
