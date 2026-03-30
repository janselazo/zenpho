import { redirect } from "next/navigation";

/** Legacy phase URLs now open the product hub with project + tab in the query string. */
export default async function PhaseRedirectPage({
  params,
}: {
  params: Promise<{ productId: string; phaseId: string }>;
}) {
  const { productId, phaseId } = await params;
  redirect(
    `/products/${productId}?project=${encodeURIComponent(phaseId)}&tab=tasks`
  );
}
