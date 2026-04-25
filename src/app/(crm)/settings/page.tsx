import { DEFAULT_MERGED_CRM_FIELD_OPTIONS } from "@/lib/crm/field-options";
import {
  mergeDealPipelineFromDb,
  mergeLeadPipelineFromDb,
} from "@/lib/crm/pipeline-columns";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import SettingsPageView, {
  type SettingsCrmFieldsPack,
} from "@/components/crm/SettingsPageView";
import { fetchCrmPipelineSettings } from "@/lib/crm/fetch-pipeline-settings";
import { fetchMergedCrmFieldOptions } from "@/lib/crm/fetch-crm-field-options";

function asNullableString(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

function emptyCrmFieldsPack(): SettingsCrmFieldsPack {
  return {
    fieldOptions: DEFAULT_MERGED_CRM_FIELD_OPTIONS,
    pipeline: {
      lead: mergeLeadPipelineFromDb(null),
      deal: mergeDealPipelineFromDb(null),
    },
    leadStageCounts: {},
    dealStageCounts: {},
  };
}

export default async function SettingsPage() {
  const configured = isSupabaseConfigured();
  let email: string | null = null;
  let fullName: string | null = null;
  let phone: string | null = null;
  let role: string | null = null;
  let avatarUrl: string | null = null;
  let profileError: string | null = null;

  if (configured) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      email = user?.email ?? null;
      if (typeof email !== "string") email = email == null ? null : String(email);
      if (user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("full_name, role, phone, avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        if (error) profileError = error.message;
        else if (profile) {
          fullName = asNullableString(profile.full_name);
          role = asNullableString(profile.role);
          phone = asNullableString(profile.phone);
          avatarUrl = asNullableString(profile.avatar_url);
        }
      }
    } catch (e) {
      console.error("settings: profile load failed", e);
      profileError =
        e instanceof Error
          ? e.message
          : "Could not load profile. Refresh and try again.";
    }
  }

  let crmFields: SettingsCrmFieldsPack | null = null;
  let crmFieldsError: string | null = null;
  if (configured) {
    try {
      const supabase = await createClient();
      const [pipeline, fieldOptions, leadsRes, dealsRes] = await Promise.all([
        fetchCrmPipelineSettings(),
        fetchMergedCrmFieldOptions(),
        supabase.from("lead").select("stage"),
        supabase.from("deal").select("stage"),
      ]);
      const leadStageCounts: Record<string, number> = {};
      for (const row of leadsRes.data ?? []) {
        const s =
          String((row as { stage?: string }).stage ?? "").trim() || "contacted";
        leadStageCounts[s] = (leadStageCounts[s] ?? 0) + 1;
      }
      const dealStageCounts: Record<string, number> = {};
      for (const row of dealsRes.data ?? []) {
        const s =
          String((row as { stage?: string }).stage ?? "").trim() || "prospect";
        dealStageCounts[s] = (dealStageCounts[s] ?? 0) + 1;
      }
      crmFields = {
        fieldOptions,
        pipeline,
        leadStageCounts,
        dealStageCounts,
      };
      crmFields = JSON.parse(JSON.stringify(crmFields)) as SettingsCrmFieldsPack;
    } catch (e) {
      console.error("settings: CRM fields load failed", e);
      crmFields = emptyCrmFieldsPack();
      crmFieldsError =
        "Could not load saved CRM field options (showing defaults). If this persists after refresh, check the server logs or your database connection.";
    }
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
        crmFieldsError={crmFieldsError}
      />
    </div>
  );
}
