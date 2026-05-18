"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchCrmAccessContext } from "@/lib/crm/access-context";
import { normalizeE164 } from "@/lib/crm/phone";
import {
  APPOINTMENT_REMINDER_PRESETS,
  type AppointmentReminderPreference,
  type AppointmentReminderTemplate,
} from "@/lib/crm/appointment-reminder-config";

const FLOW_KEY = "appointment_reminder" as const;
const ROUTE = "/automations/appointment-reminder";

const ALLOWED_MINUTES = new Set<number>(
  APPOINTMENT_REMINDER_PRESETS.map((p) => p.minutes)
);

export type LoadAppointmentReminderResult =
  | {
      status: "ok";
      enabled: boolean;
      template: AppointmentReminderTemplate;
      preference: AppointmentReminderPreference;
      profileEmail: string | null;
      profilePhone: string | null;
      canEditTemplate: boolean;
    }
  | { status: "no_user" }
  | { status: "no_org" };

const DEFAULT_TEMPLATE: AppointmentReminderTemplate = {
  emailSubject: "Reminder: {{appointment.title}} {{appointment.startsRelative}}",
  emailHtml:
    '<p>Heads up - your appointment is coming up.</p><ul><li><strong>What:</strong> {{appointment.title}}</li><li><strong>When:</strong> {{appointment.startsAt}} ({{appointment.startsRelative}})</li><li><strong>Lead:</strong> {{lead.name}}</li><li><strong>Phone:</strong> {{lead.phone}}</li></ul><p><a href="{{appointment.url}}">Open in CRM</a></p>',
  smsBody:
    "Reminder: {{appointment.title}} at {{appointment.startsAt}}. Lead: {{lead.name}}. {{appointment.url}}",
};

export async function loadAppointmentReminderAutomation(): Promise<LoadAppointmentReminderResult> {
  const supabase = await createClient();
  const ctx = await fetchCrmAccessContext(supabase);
  if (!ctx) return { status: "no_user" };
  if (!ctx.organizationId) return { status: "no_org" };

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
        .from("appointment_reminder_preference")
        .select(
          "lead_minutes_before, email_enabled, sms_enabled, app_enabled, override_email, override_phone"
        )
        .eq("user_id", ctx.userId)
        .maybeSingle(),
      admin
        .from("profiles")
        .select("email, phone")
        .eq("id", ctx.userId)
        .maybeSingle(),
    ]);

  const template: AppointmentReminderTemplate = {
    emailSubject:
      (autoRow?.email_subject as string | null)?.trim() ||
      DEFAULT_TEMPLATE.emailSubject,
    emailHtml:
      (autoRow?.email_html as string | null) || DEFAULT_TEMPLATE.emailHtml,
    smsBody:
      (autoRow?.sms_body as string | null) || DEFAULT_TEMPLATE.smsBody,
  };

  return {
    status: "ok",
    enabled: autoRow ? autoRow.enabled !== false : true,
    template,
    preference: {
      leadMinutesBefore: parseLeadMinutes(prefRow?.lead_minutes_before),
      emailEnabled: prefRow ? prefRow.email_enabled !== false : true,
      smsEnabled: prefRow?.sms_enabled === true,
      appEnabled: prefRow ? prefRow.app_enabled !== false : true,
      overrideEmail: (prefRow?.override_email as string | null)?.trim() || "",
      overridePhone: (prefRow?.override_phone as string | null)?.trim() || "",
    },
    profileEmail: ctx.email,
    profilePhone: (profileRow?.phone as string | null) ?? null,
    canEditTemplate: ctx.canManageTeam,
  };
}

export async function saveAppointmentReminderEnabled(formData: FormData) {
  const supabase = await createClient();
  const ctx = await fetchCrmAccessContext(supabase);
  if (!ctx) return { error: "Sign in required." };
  if (!ctx.canManageTeam) {
    return { error: "Only Admins or Super Admins can enable or pause flows." };
  }
  if (!ctx.organizationId) return { error: "Your profile has no workspace." };

  const enabled = formData.get("enabled") === "on";
  const admin = createAdminClient();
  const { error } = await admin.from("lead_automation").upsert(
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
  revalidatePath(ROUTE);
  revalidatePath("/automations");
  return { ok: true as const };
}

export async function saveAppointmentReminderTemplate(formData: FormData) {
  const supabase = await createClient();
  const ctx = await fetchCrmAccessContext(supabase);
  if (!ctx) return { error: "Sign in required." };
  if (!ctx.canManageTeam) {
    return { error: "Only Admins or Super Admins can edit team templates." };
  }
  if (!ctx.organizationId) return { error: "Your profile has no workspace." };

  const emailSubject =
    String(formData.get("email_subject") ?? "").trim() ||
    DEFAULT_TEMPLATE.emailSubject;
  const emailHtml =
    String(formData.get("email_html") ?? "").trim() ||
    DEFAULT_TEMPLATE.emailHtml;
  const smsBody =
    String(formData.get("sms_body") ?? "").trim() || DEFAULT_TEMPLATE.smsBody;

  const admin = createAdminClient();
  const { error } = await admin.from("lead_automation").upsert(
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
  revalidatePath(ROUTE);
  return { ok: true as const };
}

export async function saveMyAppointmentReminderPreference(formData: FormData) {
  const supabase = await createClient();
  const ctx = await fetchCrmAccessContext(supabase);
  if (!ctx) return { error: "Sign in required." };

  const leadMinutes = formData
    .getAll("lead_minutes")
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v) && ALLOWED_MINUTES.has(v))
    .sort((a, b) => a - b);

  if (leadMinutes.length === 0) {
    return { error: "Choose at least one reminder time." };
  }

  const emailEnabled = formData.get("channel_email") === "on";
  const smsEnabled = formData.get("channel_sms") === "on";
  const appEnabled = formData.get("channel_app") === "on";

  if (!emailEnabled && !smsEnabled && !appEnabled) {
    return { error: "Choose at least one channel." };
  }

  const overrideEmailRaw = String(formData.get("override_email") ?? "").trim();
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

  if (smsEnabled && !overridePhone) {
    const { data: profileRow } = await createAdminClient()
      .from("profiles")
      .select("phone")
      .eq("id", ctx.userId)
      .maybeSingle();
    if (!(profileRow?.phone as string | null)?.trim()) {
      return {
        error:
          "SMS reminders need a phone number. Add one here or save a profile phone first.",
      };
    }
  }

  const admin = createAdminClient();
  const { error } = await admin.from("appointment_reminder_preference").upsert(
    {
      user_id: ctx.userId,
      lead_minutes_before: leadMinutes,
      email_enabled: emailEnabled,
      sms_enabled: smsEnabled,
      app_enabled: appEnabled,
      override_email: overrideEmailRaw || null,
      override_phone: overridePhone,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) return { error: error.message };
  revalidatePath(ROUTE);
  return { ok: true as const };
}

function parseLeadMinutes(value: unknown): number[] {
  const raw = Array.isArray(value) ? value : [15];
  const cleaned = raw
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v) && ALLOWED_MINUTES.has(v))
    .sort((a, b) => a - b);
  return cleaned.length > 0 ? cleaned : [15];
}
