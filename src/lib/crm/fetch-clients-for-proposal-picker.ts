import { createClient } from "@/lib/supabase/server";
import { fetchCrmAccessContext } from "@/lib/crm/access-context";

export type ProposalClientOption = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  phone: string | null;
  notes: string | null;
};

export async function fetchClientsForProposalPicker(): Promise<
  ProposalClientOption[]
> {
  const supabase = await createClient();
  const access = await fetchCrmAccessContext(supabase);
  let query = supabase
    .from("client")
    .select("id, name, email, company, phone, notes, owner_id")
    .order("created_at", { ascending: false })
    .limit(300);
  if (access && !access.canManageTeam) {
    query = query.eq("owner_id", access.userId);
  }
  const { data, error } = await query;

  if (error || !data) return [];

  return data.map((c) => ({
    id: c.id as string,
    name:
      c.name?.trim() ||
      c.company?.trim() ||
      c.email?.trim() ||
      "Unnamed",
    email: c.email ?? null,
    company: c.company ?? null,
    phone: typeof c.phone === "string" ? c.phone.trim() || null : null,
    notes: typeof c.notes === "string" ? c.notes : null,
  }));
}
