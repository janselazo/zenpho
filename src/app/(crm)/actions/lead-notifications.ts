"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchCrmAccessContext } from "@/lib/crm/access-context";

export type LeadNotificationPreferenceState = {
  emailNewLead: boolean;
  smsNewLead: boolean;
  smsPhone: string;
};

export type LeadNotificationTemplateState = {
  emailSubject: string;
  emailHtml: string;
  smsBody: string;
};

export type LoadLeadNotificationsResult =
  | {
      status: "ok";
      preference: LeadNotificationPreferenceState;
      template: LeadNotificationTemplateState;
      canEditTemplate: boolean;
      profileEmail: string | null;
    }
  | { status: "no_user" }
  | { status: "no_org" };

const DEFAULT_TEMPLATE: LeadNotificationTemplateState = {
  emailSubject: "New lead: {{lead.name}}",
  emailHtml:
    '<p>You have a new lead.</p><ul><li><strong>Name:</strong> {{lead.name}}</li><li><strong>Email:</strong> {{lead.email}}</li><li><strong>Phone:</strong> {{lead.phone}}</li><li><strong>Source:</strong> {{lead.source}}</li></ul><p><a href="{{lead.url}}">Open in CRM</a></p>',
  smsBody:
    "New lead {{lead.name}} ({{lead.source}}). Phone: {{lead.phone}}. Open: {{lead.url}}",
};

export async function loadLeadNotificationsPage(): Promise<LoadLeadNotificationsResult> {
  const supabase = await createClient();
  const ctx = await fetchCrmAccessContext(supabase);
  if (!ctx) return { status: "no_user" };
  if (!ctx.organizationId) return { status: "no_org" };

  const admin = createAdminClient();

  const [{ data: prefRow }, { data: templateRow }, { data: profileRow }] =
    await Promise.all([
      admin
        .from("lead_notification_preference")
        .select("email_new_lead, sms_new_lead, sms_phone")
        .eq("user_id", ctx.userId)
        .maybeSingle(),
      admin
        .from("lead_notification_template")
        .select("email_subject, email_html, sms_body")
        .eq("organization_id", ctx.organizationId)
        .maybeSingle(),
      admin
        .from("profiles")
        .select("email, phone")
        .eq("id", ctx.userId)
        .maybeSingle(),
    ]);

  const preference: LeadNotificationPreferenceState = {
    emailNewLead: prefRow ? prefRow.email_new_lead !== false : true,
    smsNewLead: prefRow?.sms_new_lead === true,
    smsPhone:
      (prefRow?.sms_phone as string | null)?.trim() ||
      (profileRow?.phone as string | null)?.trim() ||
      "",
  };

  const template: LeadNotificationTemplateState = {
    emailSubject:
      (templateRow?.email_subject as string | null)?.trim() ||
      DEFAULT_TEMPLATE.emailSubject,
    emailHtml:
      (templateRow?.email_html as string | null) || DEFAULT_TEMPLATE.emailHtml,
    smsBody:
      (templateRow?.sms_body as string | null) || DEFAULT_TEMPLATE.smsBody,
  };

  return {
    status: "ok",
    preference,
    template,
    canEditTemplate: ctx.canManageTeam,
    profileEmail: ctx.email,
  };
}

export async function saveLeadNotificationPreference(formData: FormData) {
  const supabase = await createClient();
  const ctx = await fetchCrmAccessContext(supabase);
  if (!ctx) return { error: "Sign in required." };

  const emailNewLead = formData.get("email_new_lead") === "on";
  const smsNewLead = formData.get("sms_new_lead") === "on";
  const smsPhoneRaw = String(formData.get("sms_phone") ?? "").trim();
  const smsPhone = smsPhoneRaw ? normalizeE164(smsPhoneRaw) : null;

  if (smsNewLead && !smsPhone) {
    return {
      error:
        "Add an SMS phone number (E.164 format, e.g. +14155551234) to enable SMS notifications.",
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
        sms_phone: smsPhone,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) return { error: error.message };
  revalidatePath("/settings/notifications");
  return { ok: true as const };
}

export async function saveLeadNotificationTemplate(formData: FormData) {
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
    .from("lead_notification_template")
    .upsert(
      {
        organization_id: ctx.organizationId,
        email_subject: emailSubject,
        email_html: emailHtml,
        sms_body: smsBody,
        updated_at: new Date().toISOString(),
        updated_by: ctx.userId,
      },
      { onConflict: "organization_id" }
    );

  if (error) return { error: error.message };
  revalidatePath("/settings/notifications");
  return { ok: true as const };
}

function normalizeE164(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("+")) {
    const digits = trimmed.replace(/[^\d]/g, "");
    return digits.length >= 8 ? `+${digits}` : null;
  }
  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 8) return `+${digits}`;
  return null;
}
