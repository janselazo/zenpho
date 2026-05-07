import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Matches `supabase/migrations/20260610120000_organization_multitenancy.sql` legacy backfill UUID.
 */
export const LEGACY_ORGANIZATION_ID = "00000000-0000-0000-0000-000000000001";

export async function fetchCurrentOrganizationId(
  supabase: SupabaseClient
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();

  const id = data?.organization_id;
  return typeof id === "string" && id ? id : null;
}
