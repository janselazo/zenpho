import twilio from "twilio";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicAppOrigin } from "@/lib/crm/prospect-preview-public-url";
import { normalizeE164 } from "@/lib/crm/phone";
import { getAgencySendGridCredentials } from "@/lib/sendgrid/agency-credentials";
import { sendSendGridMail } from "@/lib/sendgrid/mail-send";
import { getAgencyTwilioCredentials } from "@/lib/twilio/agency-credentials";

const FLOW_KEY = "appointment_reminder";
const MAX_LEAD_MINUTES = 1440;
const LOOKBACK_MINUTES = 10;

const DEFAULT_TEMPLATE = {
  email_subject: "Reminder: {{appointment.title}} {{appointment.startsRelative}}",
  email_html:
    '<p>Heads up - your appointment is coming up.</p><ul><li><strong>What:</strong> {{appointment.title}}</li><li><strong>When:</strong> {{appointment.startsAt}} ({{appointment.startsRelative}})</li><li><strong>Lead:</strong> {{lead.name}}</li><li><strong>Phone:</strong> {{lead.phone}}</li></ul><p><a href="{{appointment.url}}">Open in CRM</a></p>',
  sms_body:
    "Reminder: {{appointment.title}} at {{appointment.startsAt}}. Lead: {{lead.name}}. {{appointment.url}}",
};

type AppointmentLead = {
  id: string;
  owner_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
};

type AppointmentRow = {
  id: string;
  organization_id: string | null;
  title: string | null;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  status: string | null;
  created_by: string | null;
  lead_id: string | null;
  lead: AppointmentLead | AppointmentLead[] | null;
};

type Automation = {
  enabled: boolean;
  template: {
    email_subject: string;
    email_html: string;
    sms_body: string;
  };
};

type Recipient = {
  userId: string;
  email: string | null;
  phone: string | null;
  fullName: string | null;
  leadMinutes: number[];
  emailEnabled: boolean;
  smsEnabled: boolean;
  appEnabled: boolean;
};

export type AppointmentReminderRunResult = {
  ok: boolean;
  scanned: number;
  attempted: number;
  sent: number;
  skipped: number;
  errors: string[];
};

export async function runDueAppointmentReminders(opts?: {
  now?: Date;
}): Promise<AppointmentReminderRunResult> {
  const now = opts?.now ?? new Date();
  const admin = createAdminClient();
  const result: AppointmentReminderRunResult = {
    ok: true,
    scanned: 0,
    attempted: 0,
    sent: 0,
    skipped: 0,
    errors: [],
  };

  const rangeEnd = new Date(now.getTime() + (MAX_LEAD_MINUTES + 5) * 60_000);
  const { data: appointments, error } = await admin
    .from("appointment")
    .select(
      "id, organization_id, title, description, starts_at, ends_at, status, created_by, lead_id, lead:lead_id ( id, owner_id, name, email, phone )"
    )
    .gte("starts_at", now.toISOString())
    .lte("starts_at", rangeEnd.toISOString())
    .in("status", ["scheduled", "rescheduled"])
    .order("starts_at", { ascending: true });

  if (error) {
    return {
      ...result,
      ok: false,
      errors: [`Appointment scan failed: ${error.message}`],
    };
  }

  result.scanned = appointments?.length ?? 0;
  const automationCache = new Map<string, PromiseLike<Automation>>();

  for (const raw of appointments ?? []) {
    const appointment = raw as AppointmentRow;
    if (!appointment.organization_id) {
      result.skipped += 1;
      continue;
    }

    const automation = await getAutomation(
      admin,
      appointment.organization_id,
      automationCache
    );
    if (!automation.enabled) {
      result.skipped += 1;
      continue;
    }

    const recipients = await resolveRecipients(admin, appointment);
    if (recipients.length === 0) {
      result.skipped += 1;
      continue;
    }

    for (const recipient of recipients) {
      if (!recipient.emailEnabled && !recipient.smsEnabled && !recipient.appEnabled) {
        result.skipped += 1;
        continue;
      }

      for (const leadMinutes of recipient.leadMinutes) {
        if (!shouldFire(now, appointment.starts_at, leadMinutes)) continue;

        result.attempted += 1;
        const claimed = await claimReminder(admin, {
          appointmentId: appointment.id,
          userId: recipient.userId,
          leadMinutes,
          appointmentStartsAt: appointment.starts_at,
        });
        if (!claimed) {
          result.skipped += 1;
          continue;
        }

        const sendResult = await dispatchReminder(admin, {
          appointment,
          automation,
          recipient,
          leadMinutes,
          logId: claimed.id,
        });

        if (sendResult.ok) {
          result.sent += 1;
        } else {
          result.ok = false;
          result.errors.push(...sendResult.errors);
        }
      }
    }
  }

  return result;
}

async function getAutomation(
  admin: SupabaseClient,
  organizationId: string,
  cache: Map<string, PromiseLike<Automation>>
): Promise<Automation> {
  const cached = cache.get(organizationId);
  if (cached) return cached;

  const promise = admin
    .from("lead_automation")
    .select("enabled, email_subject, email_html, sms_body")
    .eq("organization_id", organizationId)
    .eq("flow_key", FLOW_KEY)
    .maybeSingle()
    .then(({ data }) => ({
      enabled: data ? data.enabled !== false : true,
      template: {
        email_subject:
          (data?.email_subject as string | null)?.trim() ||
          DEFAULT_TEMPLATE.email_subject,
        email_html:
          (data?.email_html as string | null) || DEFAULT_TEMPLATE.email_html,
        sms_body: (data?.sms_body as string | null) || DEFAULT_TEMPLATE.sms_body,
      },
    }));

  cache.set(organizationId, promise);
  return promise;
}

async function resolveRecipients(
  admin: SupabaseClient,
  appointment: AppointmentRow
): Promise<Recipient[]> {
  const lead = normalizeLead(appointment.lead);
  const userIds = new Set<string>();

  if (appointment.created_by) userIds.add(appointment.created_by);
  if (lead?.owner_id) userIds.add(lead.owner_id);

  if (userIds.size === 0 && appointment.organization_id) {
    const { data: admins } = await admin
      .from("profiles")
      .select("id, email, role")
      .eq("organization_id", appointment.organization_id);

    for (const row of admins ?? []) {
      const role = ((row.role as string | null) ?? "").trim();
      if (role === "super_admin" || role === "admin" || role === "agency_admin") {
        userIds.add(row.id as string);
      }
    }
  }

  if (userIds.size === 0) return [];

  const [{ data: profiles }, { data: prefs }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, phone, full_name")
      .in("id", [...userIds]),
    admin
      .from("appointment_reminder_preference")
      .select(
        "user_id, lead_minutes_before, email_enabled, sms_enabled, app_enabled, override_email, override_phone"
      )
      .in("user_id", [...userIds]),
  ]);

  const prefMap = new Map<string, {
    leadMinutes: number[];
    emailEnabled: boolean;
    smsEnabled: boolean;
    appEnabled: boolean;
    overrideEmail: string | null;
    overridePhone: string | null;
  }>();

  for (const pref of prefs ?? []) {
    prefMap.set(pref.user_id as string, {
      leadMinutes: parseLeadMinutes(pref.lead_minutes_before),
      emailEnabled: pref.email_enabled !== false,
      smsEnabled: pref.sms_enabled === true,
      appEnabled: pref.app_enabled !== false,
      overrideEmail: (pref.override_email as string | null)?.trim() || null,
      overridePhone: (pref.override_phone as string | null)?.trim() || null,
    });
  }

  return (profiles ?? []).map((profile) => {
    const id = profile.id as string;
    const pref = prefMap.get(id);
    const email = pref?.overrideEmail ?? ((profile.email as string | null) ?? null);
    const phone = pref?.overridePhone ?? ((profile.phone as string | null) ?? null);
    return {
      userId: id,
      email,
      phone,
      fullName: (profile.full_name as string | null) ?? null,
      leadMinutes: pref?.leadMinutes ?? [15],
      emailEnabled: pref ? pref.emailEnabled : true,
      smsEnabled: pref ? pref.smsEnabled : false,
      appEnabled: pref ? pref.appEnabled : true,
    };
  });
}

async function claimReminder(
  admin: SupabaseClient,
  input: {
    appointmentId: string;
    userId: string;
    leadMinutes: number;
    appointmentStartsAt: string;
  }
): Promise<{ id: string } | null> {
  const { data, error } = await admin
    .from("appointment_reminder_log")
    .upsert(
      {
        appointment_id: input.appointmentId,
        user_id: input.userId,
        lead_minutes: input.leadMinutes,
        appointment_starts_at: input.appointmentStartsAt,
      },
      {
        onConflict: "appointment_id,user_id,lead_minutes,appointment_starts_at",
        ignoreDuplicates: true,
      }
    )
    .select("id")
    .maybeSingle();

  if (error || !data?.id) return null;
  return { id: data.id as string };
}

async function dispatchReminder(
  admin: SupabaseClient,
  input: {
    appointment: AppointmentRow;
    automation: Automation;
    recipient: Recipient;
    leadMinutes: number;
    logId: string;
  }
): Promise<{ ok: boolean; errors: string[] }> {
  const { appointment, automation, recipient, leadMinutes } = input;
  const lead = normalizeLead(appointment.lead);
  const tokens = buildTokens(appointment, lead, recipient, leadMinutes);
  const errors: string[] = [];
  let emailStatus: string | null = null;
  let smsStatus: string | null = null;
  let appStatus: string | null = null;

  if (recipient.emailEnabled) {
    if (!recipient.email?.trim()) {
      emailStatus = "skipped:no_destination";
    } else {
      const creds = await getAgencySendGridCredentials({
        organizationId: appointment.organization_id,
      });
      if (!creds) {
        emailStatus = "error:sendgrid_not_configured";
        errors.push("SendGrid is not configured for appointment reminders.");
      } else {
        const html = renderTemplate(automation.template.email_html, tokens);
        const sent = await sendSendGridMail({
          apiKey: creds.apiKey,
          to: recipient.email,
          from: { email: creds.fromEmail, name: creds.fromName ?? null },
          replyTo: creds.replyTo ?? null,
          subject: renderTemplate(automation.template.email_subject, tokens),
          html,
          text: htmlToText(html),
        });
        emailStatus = sent.ok ? "sent" : `error:${sent.error}`;
        if (!sent.ok) errors.push(`Email reminder failed: ${sent.error}`);
      }
    }
  }

  if (recipient.smsEnabled) {
    const to = normalizeE164(recipient.phone ?? "") ?? recipient.phone?.trim() ?? "";
    if (!to) {
      smsStatus = "skipped:no_destination";
    } else {
      const creds = await getAgencyTwilioCredentials({
        organizationId: appointment.organization_id,
      });
      if (!creds?.fromPhone) {
        smsStatus = "error:twilio_not_configured";
        errors.push("Twilio is not configured for appointment reminders.");
      } else {
        try {
          const client = twilio(creds.accountSid, creds.authToken);
          await client.messages.create({
            from: creds.fromPhone,
            to,
            body: renderTemplate(automation.template.sms_body, tokens).slice(0, 1500),
          });
          smsStatus = "sent";
        } catch (e) {
          const msg = e instanceof Error ? e.message : "SMS failed";
          smsStatus = `error:${msg}`;
          errors.push(`SMS reminder failed: ${msg}`);
        }
      }
    }
  }

  if (recipient.appEnabled) {
    const { error } = await admin.from("app_notification").insert({
      organization_id: appointment.organization_id,
      user_id: recipient.userId,
      type: "appointment_reminder",
      title: renderTemplate(automation.template.email_subject, tokens).slice(0, 120),
      body: renderTemplate(automation.template.sms_body, tokens).slice(0, 240),
      href: tokens.appointment.urlPath,
      metadata: {
        appointment_id: appointment.id,
        lead_minutes: leadMinutes,
        starts_at: appointment.starts_at,
      },
    });
    appStatus = error ? `error:${error.message}` : "sent";
    if (error) errors.push(`App notification failed: ${error.message}`);
  }

  await admin
    .from("appointment_reminder_log")
    .update({
      email_status: emailStatus,
      sms_status: smsStatus,
      app_status: appStatus,
      error: errors.join("; ") || null,
    })
    .eq("id", input.logId);

  return { ok: errors.length === 0, errors };
}

function shouldFire(now: Date, startsAt: string, leadMinutes: number): boolean {
  const starts = new Date(startsAt).getTime();
  if (Number.isNaN(starts)) return false;
  const target = starts - leadMinutes * 60_000;
  const current = now.getTime();
  return target <= current && target > current - LOOKBACK_MINUTES * 60_000;
}

function normalizeLead(
  value: AppointmentLead | AppointmentLead[] | null
): AppointmentLead | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function parseLeadMinutes(value: unknown): number[] {
  const raw = Array.isArray(value) ? value : [15];
  const cleaned = raw
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v) && v > 0 && v <= MAX_LEAD_MINUTES)
    .sort((a, b) => a - b);
  return cleaned.length ? cleaned : [15];
}

function buildTokens(
  appointment: AppointmentRow,
  lead: AppointmentLead | null,
  recipient: Recipient,
  leadMinutes: number
) {
  const urlPath = appointment.lead_id
    ? `/leads/${appointment.lead_id}`
    : "/calendar";
  return {
    appointment: {
      title: appointment.title?.trim() || "Appointment",
      description: appointment.description?.trim() || "",
      startsAt: formatDateTime(appointment.starts_at),
      startsRelative: formatRelativeLead(leadMinutes),
      url: `${getPublicAppOrigin()}${urlPath}`,
      urlPath,
    },
    lead: {
      name: lead?.name?.trim() || "No linked lead",
      email: lead?.email?.trim() || "",
      phone: lead?.phone?.trim() || "",
    },
    owner: {
      name: recipient.fullName?.trim() || recipient.email?.trim() || "",
    },
  };
}

function renderTemplate(input: string, tokens: ReturnType<typeof buildTokens>) {
  return input.replace(
    /\{\{\s*([a-zA-Z][a-zA-Z0-9_.]*)\s*\}\}/g,
    (_, rawPath: string) => lookup(tokens, rawPath) ?? ""
  );
}

function lookup(obj: unknown, path: string): string | null {
  let current: unknown = obj;
  for (const part of path.split(".")) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return null;
    }
  }
  if (current == null || typeof current === "object") return null;
  return String(current);
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>(\s*)/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatRelativeLead(minutes: number): string {
  if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  if (minutes === 60) return "in 1 hour";
  if (minutes === 1440) return "tomorrow";
  const hours = minutes / 60;
  if (Number.isInteger(hours)) return `in ${hours} hours`;
  return `in ${minutes} minutes`;
}
