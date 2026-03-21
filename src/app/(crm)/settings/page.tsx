import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  let email: string | null = null;
  let fullName: string | null = null;
  let role: string | null = null;
  let profileError: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
    if (user) {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .maybeSingle();
      if (error) profileError = error.message;
      else if (profile) {
        fullName = profile.full_name;
        role = profile.role;
      }
    }
  }

  return (
    <div className="p-8">
      <h1 className="heading-display text-2xl font-bold text-text-primary">
        Settings
      </h1>
      <p className="mt-1 text-sm text-text-secondary">
        Account and agency preferences (expand later)
      </p>

      <div className="mt-8 max-w-lg space-y-4 rounded-2xl border border-border bg-white p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            Signed in as
          </p>
          <p className="mt-1 text-sm text-text-primary">{email ?? "—"}</p>
        </div>
        {fullName ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Name
            </p>
            <p className="mt-1 text-sm text-text-primary">{fullName}</p>
          </div>
        ) : null}
        {role ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Role
            </p>
            <p className="mt-1 text-sm text-text-primary">{role}</p>
          </div>
        ) : null}
        {profileError ? (
          <p className="text-sm text-amber-800">{profileError}</p>
        ) : null}
        <p className="text-xs text-text-secondary">
          Team invites, agency name, and notification preferences can be added
          here next.
        </p>
      </div>
    </div>
  );
}
