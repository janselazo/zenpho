import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PortalHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/portal");

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id")
    .eq("id", user.id)
    .single();

  const clientId = profile?.client_id;
  if (!clientId) {
    return (
      <div className="rounded-2xl border border-border bg-white p-6 text-sm text-text-secondary">
        Your account is not linked to a client record yet. Ask your agency
        contact to set <code className="font-mono text-xs">client_id</code> on
        your profile in Supabase.
      </div>
    );
  }

  const { data: projects, error } = await supabase
    .from("project")
    .select("id, title, status, target_date")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="text-sm text-red-700">
        {error.message}. Ensure migrations are applied.
      </p>
    );
  }

  return (
    <div>
      <h1 className="heading-display text-2xl font-bold text-text-primary">
        Your projects
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        Open a project to see the timeline and visible tasks.
      </p>
      <ul className="mt-8 space-y-3">
        {(projects ?? []).length === 0 ? (
          <li className="rounded-2xl border border-dashed border-border bg-white px-4 py-10 text-center text-sm text-text-secondary">
            No projects yet.
          </li>
        ) : (
          (projects ?? []).map((p) => (
            <li key={p.id}>
              <Link
                href={`/portal/projects/${p.id}`}
                className="block rounded-2xl border border-border bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="font-medium text-text-primary">{p.title}</span>
                <span className="mt-1 block text-sm text-text-secondary">
                  {p.status}
                  {p.target_date ? ` · target ${p.target_date}` : ""}
                </span>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
