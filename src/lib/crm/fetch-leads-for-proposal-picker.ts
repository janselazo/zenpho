import { createClient } from "@/lib/supabase/server";

export type ProposalLeadOption = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
};

/**
 * Leads for the new-proposal picker. Includes converted contacts (Won/Lost and
 * other paths that set `converted_client_id`) so proposals can be tied to the
 * same lead record; `ensureClientIdForProposalFromLead` reuses the linked client.
 */
export async function fetchLeadsForProposalPicker(): Promise<
  ProposalLeadOption[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead")
    .select("id, name, email, company")
    .order("created_at", { ascending: false })
    .limit(300);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id as string,
    name:
      (row.name as string | null)?.trim() ||
      (row.company as string | null)?.trim() ||
      (row.email as string | null)?.trim() ||
      "Unnamed lead",
    email: (row.email as string | null) ?? null,
    company: (row.company as string | null) ?? null,
  }));
}
