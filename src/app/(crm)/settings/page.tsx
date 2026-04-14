import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import SettingsPageView, {
  type SettingsCrmFieldsPack,
} from "@/components/crm/SettingsPageView";
import { fetchCrmPipelineSettings } from "@/lib/crm/fetch-pipeline-settings";
import { fetchMergedCrmFieldOptions } from "@/lib/crm/fetch-crm-field-options";

export default async function SettingsPage() {
  const configured = isSupabaseConfigured();
  let email: string | null = null;
  let fullName: string | null = null;
  let phone: string | null = null;
  let role: string | null = null;
  let avatarUrl: string | null = null;
  let profileError: string | null = null;

  if (configured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    email = user?.email ?? null;
    if (user) {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, role, phone, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (error) profileError = error.message;
      else if (profile) {
        fullName = profile.full_name;
        role = profile.role;
        phone = profile.phone ?? null;
        avatarUrl = profile.avatar_url ?? null;
      }
    }
  }

  let crmFields: SettingsCrmFieldsPack | null = null;
  if (configured) {
    const supabase = await createClient();
    const [pipeline, fieldOptions, leadsRes, dealsRes] = await Promise.all([
      fetchCrmPipelineSettings(),
      fetchMergedCrmFieldOptions(),
      supabase.from("lead").select("stage"),
      supabase.from("deal").select("stage"),
    ]);
    const leadStageCounts: Record<string, number> = {};
    for (const row of leadsRes.data ?? []) {
      const s = String((row as { stage?: string }).stage ?? "").trim() || "contacted";
      leadStageCounts[s] = (leadStageCounts[s] ?? 0) + 1;
    }
    const dealStageCounts: Record<string, number> = {};
    for (const row of dealsRes.data ?? []) {
      const s = String((row as { stage?: string }).stage ?? "").trim() || "prospect";
      dealStageCounts[s] = (dealStageCounts[s] ?? 0) + 1;
    }
    crmFields = {
      fieldOptions,
      pipeline,
      leadStageCounts,
      dealStageCounts,
    };
  }

  return (
    <div className="p-8">
      <SettingsPageView
        initial={{
          configured,
          email,
          fullName,
          phone,
          role,
          avatarUrl,
          profileError,
        }}
        crmFields={crmFields}
      />
    </div>
  );
}
