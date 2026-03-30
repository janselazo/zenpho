import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { projectRowToMock, type ProjectRow } from "@/lib/crm/map-project-row";
import { projectClientDisplayLabel } from "@/lib/crm/mock-data";
import ProductAddPhaseForm from "@/components/crm/product/ProductAddPhaseForm";

export default async function ProductOverviewPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row, error } = await supabase
    .from("project")
    .select(
      "id, client_id, title, description, status, target_date, website, budget, plan_stage, project_type, metadata, parent_project_id"
    )
    .eq("id", productId)
    .maybeSingle();

  if (error || !row) notFound();
  if (row.parent_project_id) {
    redirect(`/products/${row.parent_project_id}/phases/${row.id}`);
  }

  const { data: client } = await supabase
    .from("client")
    .select("name, email, company")
    .eq("id", row.client_id)
    .maybeSingle();

  function clientLabel(c: {
    name?: string | null;
    company?: string | null;
    email?: string | null;
  }) {
    const parts = [c.name?.trim(), c.company?.trim()].filter(Boolean) as string[];
    if (parts.length) return parts.join(" · ");
    return c.email?.trim() || "Client";
  }

  const project = projectRowToMock(row as ProjectRow, clientLabel(client ?? {}));

  const { data: phases } = await supabase
    .from("project")
    .select("id, title, plan_stage, created_at")
    .eq("parent_project_id", productId)
    .order("created_at", { ascending: true });

  return (
    <div className="p-8">
      <div className="text-sm text-text-secondary dark:text-zinc-400">
        <Link href="/products" className="hover:text-accent">
          Products
        </Link>
        <span className="mx-2">›</span>
        <span className="font-medium text-text-primary dark:text-zinc-100">
          {project.title}
        </span>
      </div>

      <h1 className="heading-display mt-4 text-2xl font-bold text-text-primary dark:text-zinc-50">
        {project.title}
      </h1>
      <p className="mt-1 text-sm text-text-secondary dark:text-zinc-400">
        Product · {projectClientDisplayLabel(project)}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
            Details
          </h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="text-text-secondary dark:text-zinc-500">Target</dt>
              <dd className="font-medium text-text-primary dark:text-zinc-100">
                {project.expectedEndDate === "TBD"
                  ? "TBD"
                  : project.expectedEndDate}
              </dd>
            </div>
            {project.budget != null ? (
              <div>
                <dt className="text-text-secondary dark:text-zinc-500">
                  Budget
                </dt>
                <dd className="font-medium text-text-primary dark:text-zinc-100">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  }).format(project.budget)}
                </dd>
              </div>
            ) : null}
            {project.website ? (
              <div>
                <dt className="text-text-secondary dark:text-zinc-500">
                  Website
                </dt>
                <dd>
                  <a
                    href={
                      project.website.startsWith("http")
                        ? project.website
                        : `https://${project.website}`
                    }
                    className="font-medium text-accent hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {project.website}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className="rounded-2xl border border-border bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-text-primary dark:text-zinc-100">
            Delivery phases
          </h2>
          <p className="mt-1 text-xs text-text-secondary dark:text-zinc-500">
            Open a phase for backlog, tasks, workspace notes, and issues.
          </p>
          <ul className="mt-4 space-y-2">
            {(phases ?? []).length === 0 ? (
              <li className="text-sm text-text-secondary">No phases yet.</li>
            ) : (
              (phases ?? []).map((ph) => (
                <li key={ph.id}>
                  <Link
                    href={`/products/${productId}/phases/${ph.id}`}
                    className="block rounded-xl border border-border px-4 py-3 text-sm font-medium text-text-primary transition-colors hover:border-accent hover:text-accent dark:border-zinc-700 dark:text-zinc-100 dark:hover:border-blue-500/50"
                  >
                    {ph.title}
                    {ph.plan_stage ? (
                      <span className="ml-2 text-xs font-normal text-text-secondary">
                        · {ph.plan_stage}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))
            )}
          </ul>
          <div className="mt-6 border-t border-border pt-6 dark:border-zinc-700">
            <ProductAddPhaseForm productId={productId} />
          </div>
        </section>
      </div>
    </div>
  );
}
