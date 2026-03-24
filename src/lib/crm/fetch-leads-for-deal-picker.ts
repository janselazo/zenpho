import { createClient } from "@/lib/supabase/server";

export type LeadDealPickerOption = {
  id: string;
  label: string;
  email: string | null;
  name: string | null;
};

/**
 * Leads for the Create deal flow (a lead may have multiple deals).
 */
export async function fetchLeadsForDealPicker(): Promise<LeadDealPickerOption[]> {
  const supabase = await createClient();
  const { data: leads, error } = await supabase
    .from("lead")
    .select("id, name, email")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error || !leads?.length) return [];

  return leads.map((l) => {
    const name = l.name?.trim() ?? "";
    const email = l.email?.trim() ?? "";
    const label =
      [name, email].filter(Boolean).join(" · ") || "Unnamed lead";
    return {
      id: l.id,
      label,
      email: l.email,
      name: l.name,
    };
  });
}
