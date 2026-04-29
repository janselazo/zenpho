import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function LegacyProjectDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("project")
    .select("id, parent_project_id")
    .eq("id", id)
    .maybeSingle();

  if (!row) redirect("/products");
  if (row.parent_project_id) {
    redirect(
      `/products/${row.parent_project_id}?project=${row.id}&tab=backlog`
    );
  }
  redirect(`/products/${row.id}`);
}
