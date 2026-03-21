import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <h1 className="heading-display text-2xl font-bold">Projects</h1>
        <p className="mt-2 text-text-secondary">Configure Supabase first.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: projects, error } = await supabase
    .from("project")
    .select("id, title, status, target_date, client_id")
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <h1 className="heading-display text-2xl font-bold text-text-primary">
        Projects
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        Delivery work tied to clients
      </p>

      {error ? (
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          {error.message}
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-border rounded-2xl border border-border bg-white">
          {(projects ?? []).length === 0 ? (
            <li className="px-4 py-10 text-center text-sm text-text-secondary">
              No projects yet.
            </li>
          ) : (
            (projects ?? []).map((p) => (
              <li key={p.id} className="px-4 py-4">
                <p className="font-medium text-text-primary">{p.title}</p>
                <p className="text-sm text-text-secondary">
                  {p.status}
                  {p.target_date ? ` · due ${p.target_date}` : ""}
                </p>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
