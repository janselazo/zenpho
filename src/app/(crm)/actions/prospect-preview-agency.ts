import { createClient } from "@/lib/supabase/server";
import {
  getSupabasePublicEnv,
  SUPABASE_ENV_SETUP_MESSAGE,
} from "@/lib/supabase/config";

export async function requireAgencyStaff() {
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
  if (!user) return { error: "Unauthorized" as const, supabase: null, user: null };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role;
  if (role !== "agency_admin" && role !== "agency_member") {
    return { error: "Forbidden" as const, supabase: null, user: null };
  }
  return { error: null, supabase, user };
}
