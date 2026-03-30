import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PhaseRow = {
  id: string;
  title: string | null;
  status: string | null;
  target_date: string | null;
  parent_project_id: string | null;
};

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

  const { data: phaseRows, error } = await supabase
    .from("project")
    .select("id, title, status, target_date, parent_project_id")
    .eq("client_id", clientId)
    .not("parent_project_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="text-sm text-red-700">
        {error.message}. Ensure migrations are applied.
      </p>
    );
  }

  const phases = (phaseRows ?? []) as PhaseRow[];
  const parentIds = [
    ...new Set(
      phases
        .map((p) => p.parent_project_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const productTitleById = new Map<string, string>();
  if (parentIds.length > 0) {
    const { data: products } = await supabase
      .from("project")
      .select("id, title")
      .in("id", parentIds);
    for (const row of products ?? []) {
      productTitleById.set(
        row.id as string,
        (row.title as string | null)?.trim() || "Product"
      );
    }
  }

  return (
    <div>
      <h1 className="heading-display text-2xl font-bold text-text-primary">
        Your products
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        Open a delivery phase to see the timeline and visible tasks.
      </p>
      <ul className="mt-8 space-y-3">
        {phases.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-border bg-white px-4 py-10 text-center text-sm text-text-secondary">
            No delivery phases yet.
          </li>
        ) : (
          phases.map((p) => {
            const productName = p.parent_project_id
              ? productTitleById.get(p.parent_project_id) ?? "Product"
              : "";
            const phaseTitle = p.title?.trim() || "Phase";
            return (
              <li key={p.id}>
                <Link
                  href={`/portal/projects/${p.id}`}
                  className="block rounded-2xl border border-border bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md"
                >
                  <span className="font-medium text-text-primary">
                    {productName ? `${productName} · ${phaseTitle}` : phaseTitle}
                  </span>
                  <span className="mt-1 block text-sm text-text-secondary">
                    {p.status}
                    {p.target_date ? ` · target ${p.target_date}` : ""}
                  </span>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
