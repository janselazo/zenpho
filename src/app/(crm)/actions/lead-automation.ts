"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchCrmAccessContext } from "@/lib/crm/access-context";
import { normalizeE164 } from "@/lib/crm/phone";

const FLOW_KEY = "new_lead_alert" as const;

export type NewLeadAlertTemplate = {
  emailSubject: string;
  emailHtml: string;
  smsBody: string;
};

export type NewLeadAlertPreference = {
  emailNewLead: boolean;
  smsNewLead: boolean;
  /** Per-user override for the destination email. Empty falls back to profile email. */
  overrideEmail: string;
  /** Per-user override for the destination SMS phone. Empty falls back to profile phone. */
  overridePhone: string;
};

export type LoadNewLeadAlertResult =
  | {
      status: "ok";
      enabled: boolean;
      template: NewLeadAlertTemplate;
      preference: NewLeadAlertPreference;
      profileEmail: string | null;
      profilePhone: string | null;
      canEditTemplate: boolean;
    }
  | { status: "no_user" }
  | { status: "no_org" };

const DEFAULT_TEMPLATE: NewLeadAlertTemplate = {
  emailSubject: "New lead: {{lead.name}}",
  emailHtml:
    '<p>You have a new lead.</p><ul><li><strong>Name:</strong> {{lead.name}}</li><li><strong>Email:</strong> {{lead.email}}</li><li><strong>Phone:</strong> {{lead.phone}}</li><li><strong>Source:</strong> {{lead.source}}</li></ul><p><a href="{{lead.url}}">Open in CRM</a></p>',
  smsBody:
    "New lead {{lead.name}} ({{lead.source}}). Phone: {{lead.phone}}. Open: {{lead.url}}",
};

export async function loadNewLeadAlertAutomation(): Promise<LoadNewLeadAlertResult> {
  const supabase = await createClient();
  const ctx = await fetchCrmAccessContext(supabase);
  if (!ctx) return { status: "no_user" };
  if (!ctx.organizationId) return { status: "no_org" };

  // Use the admin client so user RLS doesn't accidentally hide the row when a
  // newly-promoted Admin lacks select access; the action itself enforces auth.
  const admin = createAdminClient();

  const [{ data: autoRow }, { data: prefRow }, { data: profileRow }] =
    await Promise.all([
      admin
        .from("lead_automation")
        .select("enabled, email_subject, email_html, sms_body")
        .eq("organization_id", ctx.organizationId)
        .eq("flow_key", FLOW_KEY)
        .maybeSingle(),
      admin
        .from("lead_notification_preference")
        .select(
          "email_new_lead, sms_new_lead, sms_phone, override_email, override_phone"
        )
        .eq("user_id", ctx.userId)
        .maybeSingle(),
      admin
        .from("profiles")
        .select("email, phone")
        .eq("id", ctx.userId)
        .maybeSingle(),
    ]);

  const template: NewLeadAlertTemplate = {
    emailSubject:
      (autoRow?.email_subject as string | null)?.trim() ||
      DEFAULT_TEMPLATE.emailSubject,
    emailHtml:
      (autoRow?.email_html as string | null) || DEFAULT_TEMPLATE.emailHtml,
    smsBody:
      (autoRow?.sms_body as string | null) || DEFAULT_TEMPLATE.smsBody,
  };

  // Legacy fallback for the override phone — if the user previously saved an
  // `sms_phone` under the old settings page and never set an override, treat
  // it as the override so the UI prefills with the value they expect.
  const legacyPhone = (prefRow?.sms_phone as string | null)?.trim() || "";
  const overridePhone =
    (prefRow?.override_phone as string | null)?.trim() || legacyPhone;

  const preference: NewLeadAlertPreference = {
    emailNewLead: prefRow ? prefRow.email_new_lead !== false : true,
    smsNewLead: prefRow?.sms_new_lead === true,
    overrideEmail: (prefRow?.override_email as string | null)?.trim() || "",
    overridePhone,
  };

  return {
    status: "ok",
    enabled: autoRow ? autoRow.enabled !== false : true,
    template,
    preference,
    profileEmail: ctx.email,
    profilePhone: (profileRow?.phone as string | null) ?? null,
    canEditTemplate: ctx.canManageTeam,
  };
}

export async function saveNewLeadAlertEnabled(formData: FormData) {
  const supabase = await createClient();
  const ctx = await fetchCrmAccessContext(supabase);
  if (!ctx) return { error: "Sign in required." };
  if (!ctx.canManageTeam) {
    return { error: "Only Admins or Super Admins can enable or pause flows." };
  }
  if (!ctx.organizationId) {
    return { error: "Your profile has no workspace." };
  }

  const enabled = formData.get("enabled") === "on";
  const admin = createAdminClient();
  const { error } = await admin
    .from("lead_automation")
    .upsert(
      {
        organization_id: ctx.organizationId,
        flow_key: FLOW_KEY,
        enabled,
        updated_at: new Date().toISOString(),
        updated_by: ctx.userId,
      },
      { onConflict: "organization_id,flow_key" }
    );

  if (error) return { error: error.message };
  revalidatePath("/automations/new-lead-alert");
  revalidatePath("/automations");
  return { ok: true as const };
}

export async function saveNewLeadAlertTemplate(formData: FormData) {
  const supabase = await createClient();
  const ctx = await fetchCrmAccessContext(supabase);
  if (!ctx) return { error: "Sign in required." };
  if (!ctx.canManageTeam) {
    return { error: "Only Admins or Super Admins can edit team templates." };
  }
  if (!ctx.organizationId) {
    return { error: "Your profile has no workspace." };
  }

  const emailSubject =
    String(formData.get("email_subject") ?? "").trim() ||
    DEFAULT_TEMPLATE.emailSubject;
  const emailHtml =
    String(formData.get("email_html") ?? "").trim() ||
    DEFAULT_TEMPLATE.emailHtml;
  const smsBody =
    String(formData.get("sms_body") ?? "").trim() || DEFAULT_TEMPLATE.smsBody;

  const admin = createAdminClient();
  const { error } = await admin
    .from("lead_automation")
    .upsert(
      {
        organization_id: ctx.organizationId,
        flow_key: FLOW_KEY,
        email_subject: emailSubject,
        email_html: emailHtml,
        sms_body: smsBody,
        updated_at: new Date().toISOString(),
        updated_by: ctx.userId,
      },
      { onConflict: "organization_id,flow_key" }
    );

  if (error) return { error: error.message };
  revalidatePath("/automations/new-lead-alert");
  return { ok: true as const };
}

export async function saveMyLeadAlertOverrides(formData: FormData) {
  const supabase = await createClient();
  const ctx = await fetchCrmAccessContext(supabase);
  if (!ctx) return { error: "Sign in required." };

  const emailNewLead = formData.get("email_new_lead") === "on";
  const smsNewLead = formData.get("sms_new_lead") === "on";

  const overrideEmailRaw = String(formData.get("override_email") ?? "").trim();
  // Bare-bones email validation — the dispatcher will surface deeper failures
  // from SendGrid, we just want to reject obvious typos at save time.
  if (overrideEmailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(overrideEmailRaw)) {
    return {
      error:
        "Override email looks invalid. Use a full address like name@example.com or leave blank to use your profile email.",
    };
  }

  const overridePhoneRaw = String(formData.get("override_phone") ?? "").trim();
  const overridePhone = overridePhoneRaw ? normalizeE164(overridePhoneRaw) : null;
  if (overridePhoneRaw && !overridePhone) {
    return {
      error:
        "Override phone looks invalid. Use E.164 format (e.g. +14155551234) or leave blank to use your profile phone.",
    };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("lead_notification_preference")
    .upsert(
      {
        user_id: ctx.userId,
        email_new_lead: emailNewLead,
        sms_new_lead: smsNewLead,
        override_email: overrideEmailRaw || null,
        override_phone: overridePhone,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) return { error: error.message };
  revalidatePath("/automations/new-lead-alert");
  return { ok: true as const };
}
