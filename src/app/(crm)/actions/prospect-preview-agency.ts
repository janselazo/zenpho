import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  getSupabasePublicEnv,
  SUPABASE_ENV_SETUP_MESSAGE,
} from "@/lib/supabase/config";
import { isInternalStaffRole } from "@/lib/crm/roles";

export type RequireAgencyStaffOk = {
  error: null;
  supabase: SupabaseClient;
  user: User;
  organizationId: string;
};

export type RequireAgencyStaffDenied = {
  error: string;
  supabase: null;
  user: null;
};

export type RequireAgencyStaffResult = RequireAgencyStaffOk | RequireAgencyStaffDenied;

/**
 * Gate a server action / page on "agency staff" — anyone in the workspace who
 * is not a client-portal user. Honors the current role model (`super_admin`,
 * `admin`, `user`) and the legacy agency roles (`agency_admin`, `agency_member`)
 * so existing data does not lock anyone out, plus the Zenpho super-admin email
 * override used by `is_super_admin()` in Postgres and `normalizeInternalRole`
 * everywhere else.
 */
export async function requireAgencyStaff(): Promise<RequireAgencyStaffResult> {
  if (!getSupabasePublicEnv()) {
    return {
      error: SUPABASE_ENV_SETUP_MESSAGE,
      supabase: null,
      user: null,
    };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", supabase: null, user: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .maybeSingle();
  const role = (profile?.role as string | null) ?? null;
  if (!isInternalStaffRole(role, user.email)) {
    return { error: "Forbidden", supabase: null, user: null };
  }
  const organizationId =
    typeof profile?.organization_id === "string"
      ? profile.organization_id.trim()
      : "";
  if (!organizationId) {
    return {
      error: "Forbidden: profile has no workspace.",
      supabase: null,
      user: null,
    };
  }
  return { error: null, supabase, user, organizationId };
}
