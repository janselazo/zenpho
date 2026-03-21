import Link from "next/link";
import NewLeadForm from "@/components/crm/NewLeadForm";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

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
  const { data: leads, error } = await supabase
    .from("lead")
    .select("id, name, email, company, stage, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="heading-display text-2xl font-bold text-text-primary">
            Leads
          </h1>
          <p className="text-sm text-text-secondary">Pipeline and new interest</p>
        </div>
        <span className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-text-secondary">
          {error ? "Run SQL migration" : `${leads?.length ?? 0} shown`}
        </span>
      </div>

      {error ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          {error.message}. Apply{" "}
          <code className="font-mono text-xs">supabase/migrations</code>.
        </p>
      ) : (
        <>
          <div className="mt-8 max-w-2xl">
            <NewLeadForm />
          </div>
          <ul className="mt-8 divide-y divide-border rounded-2xl border border-border bg-white shadow-sm">
            {(leads ?? []).length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-text-secondary">
                No leads yet. Add one with the form above.
              </li>
            ) : (
              (leads ?? []).map((lead) => (
                <li key={lead.id}>
                  <Link
                    href={`/leads/${lead.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-4 transition-colors hover:bg-surface/80"
                  >
                    <div>
                      <p className="font-medium text-text-primary">
                        {lead.name ?? "—"}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {lead.email ?? ""}{" "}
                        {lead.company ? `· ${lead.company}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
                      {lead.stage ?? "new"}
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </>
      )}

      <p className="mt-6 text-sm text-text-secondary">
        <Link href="/dashboard" className="text-accent hover:underline">
          ← Dashboard
        </Link>
      </p>
    </div>
  );
}
