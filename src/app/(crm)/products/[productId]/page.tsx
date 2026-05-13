import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchCrmAccessContext } from "@/lib/crm/access-context";
import {
  clientRowToProjectSlice,
  projectRowToMock,
  type ProjectRow,
} from "@/lib/crm/map-project-row";
import { parseChildDeliveryStatusUi } from "@/lib/crm/child-delivery-status-ui";
import { parseProductResources } from "@/lib/crm/product-project-metadata";
import {
  listDiscoverySections,
  listRoadmapPhases,
} from "@/app/(crm)/actions/product-manager";
import ProductDetailShell from "@/components/crm/product/ProductDetailShell";
import { fetchMergedCrmFieldOptions } from "@/lib/crm/fetch-crm-field-options";

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

  const access = await fetchCrmAccessContext(supabase);
  let productQuery = supabase
    .from("project")
    .select(
      "id, client_id, title, description, status, target_date, website, budget, plan_stage, project_type, metadata, parent_project_id, owner_id, assigned_to"
    )
    .eq("id", productId);
  if (access && !access.canManageTeam) {
    productQuery = productQuery.or(
      `owner_id.eq.${access.userId},assigned_to.eq.${access.userId}`
    );
  }
  const { data: row, error } = await productQuery.maybeSingle();

  if (error || !row) notFound();
  if (row.parent_project_id) {
    redirect(
      `/products/${row.parent_project_id as string}?project=${row.id}&tab=backlog`
    );
  }

  let childrenQuery = supabase
    .from("project")
    .select("id, title, plan_stage, metadata, target_date, created_at")
    .eq("parent_project_id", productId)
    .order("created_at", { ascending: true });
  if (access && !access.canManageTeam) {
    childrenQuery = childrenQuery.or(
      `owner_id.eq.${access.userId},assigned_to.eq.${access.userId}`
    );
  }

  const [
    fieldOptions,
    clientRes,
    childrenRes,
    roadmapListing,
    discoveryListing,
  ] = await Promise.all([
    fetchMergedCrmFieldOptions(),
    supabase
      .from("client")
      .select("name, email, company")
      .eq("id", row.client_id as string)
      .maybeSingle(),
    childrenQuery,
    listRoadmapPhases(productId),
    listDiscoverySections(productId),
  ]);

  const client = clientRes.data;
  const overviewRoadmapPhaseCount =
    roadmapListing.error == null ? roadmapListing.rows?.length ?? 0 : null;
  const overviewDiscoverySectionCount =
    discoveryListing.error == null ? discoveryListing.rows?.length ?? 0 : null;
  const overviewCountsError =
    roadmapListing.error && roadmapListing.error !== "Unauthorized"
      ? roadmapListing.error
      : discoveryListing.error &&
          discoveryListing.error !== "Unauthorized"
        ? discoveryListing.error
        : null;

  const project = projectRowToMock(
    row as ProjectRow,
    clientRowToProjectSlice(client ?? undefined),
    { fieldOptions }
  );

  const initialProductResources = parseProductResources(row.metadata);
  const childDeliveryStatusUi = parseChildDeliveryStatusUi(row.metadata);
  return (
    <Suspense
      fallback={<div className="p-8 text-sm text-text-secondary">Loading…</div>}
    >
      <ProductDetailShell
        productId={productId}
        product={project}
        childrenProjects={childrenRes.data ?? []}
        initialProductResources={initialProductResources}
        childDeliveryStatusUi={childDeliveryStatusUi}
        productMetadata={row.metadata}
        planLabels={fieldOptions.productPlanLabels}
        overviewRoadmapPhaseCount={overviewRoadmapPhaseCount}
        overviewDiscoverySectionCount={overviewDiscoverySectionCount}
        overviewCountsError={overviewCountsError}
      />
    </Suspense>
  );
}
