import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  getSupabasePublicEnv,
  SUPABASE_ENV_SETUP_MESSAGE,
} from "@/lib/supabase/config";

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
  const role = profile?.role;
  if (role !== "agency_admin" && role !== "agency_member") {
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
