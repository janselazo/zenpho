import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchCurrentOrganizationId } from "@/lib/organization";
import { normalizeInternalRole, type InternalRole } from "@/lib/crm/roles";

export type CrmAccessContext = {
  userId: string;
  email: string | null;
  organizationId: string | null;
  role: InternalRole;
  canManageTeam: boolean;
};

export async function fetchCrmAccessContext(
  supabase: SupabaseClient
): Promise<CrmAccessContext | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, organizationId] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    fetchCurrentOrganizationId(supabase),
  ]);

  const role = normalizeInternalRole(profile?.role, user.email);
  return {
    userId: user.id,
    email: user.email ?? null,
    organizationId,
    role,
    canManageTeam: role === "super_admin" || role === "admin",
  };
}
