import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { projectRowToMock, type ProjectRow } from "@/lib/crm/map-project-row";
import { parseProductResources } from "@/lib/crm/product-project-metadata";
import ProductDetailShell from "@/components/crm/product/ProductDetailShell";

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
    redirect(
      `/products/${row.parent_project_id as string}?project=${row.id}&tab=tasks`
    );
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

  const { data: children } = await supabase
    .from("project")
    .select("id, title, plan_stage, metadata, created_at")
    .eq("parent_project_id", productId)
    .order("created_at", { ascending: true });

  const initialProductResources = parseProductResources(row.metadata);

  return (
    <Suspense
      fallback={<div className="p-8 text-sm text-text-secondary">Loading…</div>}
    >
      <ProductDetailShell
        productId={productId}
        product={project}
        childrenProjects={children ?? []}
        initialProductResources={initialProductResources}
      />
    </Suspense>
  );
}
