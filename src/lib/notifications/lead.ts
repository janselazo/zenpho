import twilio from "twilio";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAgencySendGridCredentials } from "@/lib/sendgrid/agency-credentials";
import { sendSendGridMail } from "@/lib/sendgrid/mail-send";
import { getAgencyTwilioCredentials } from "@/lib/twilio/agency-credentials";
import { normalizeE164 } from "@/lib/crm/phone";
import {
  findFieldDataAnswer,
  renderStructuredAnswers,
  type StructuredFieldEntry,
} from "@/lib/facebook/mapping";
import { getPublicAppOrigin } from "@/lib/crm/prospect-preview-public-url";

const SUPER_ADMIN_DOMAIN = "zenpho.com";
const SUPER_ADMIN_EMAIL = "janse.lazo@gmail.com";

type LeadRow = {
  id: string;
  organization_id: string | null;
  owner_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  facebook_field_data: StructuredFieldEntry[] | null;
  facebook_form_name: string | null;
};

type Recipient = {
  userId: string;
  email: string | null;
  fullName: string | null;
  smsPhone: string | null;
  emailEnabled: boolean;
  smsEnabled: boolean;
};

type RecipientChannelResult = {
  channel: "email" | "sms";
  ok: boolean;
  reason: string;
};

export type NotifyNewLeadResult = {
  ok: boolean;
  recipientCount: number;
  results: Array<{
    userId: string;
    email: string | null;
    channels: RecipientChannelResult[];
  }>;
  errors: string[];
};

/**
 * Resolve recipients + render template tokens + dispatch via SendGrid and Twilio.
 *
 * Recipient policy:
 * - If `lead.owner_id` is set → that user only.
 * - Otherwise → every Admin or Super Admin in the lead's org.
 *
 * Per-user destination overrides in `lead_notification_preference` are honored:
 * - `override_email` (or the user's profile email) → SendGrid alert.
 * - `override_phone` (or legacy `sms_phone`, or profile.phone)  → Twilio SMS alert.
 *
 * The legacy boolean columns `email_new_lead` and `sms_new_lead` are still
 * written by `saveMyLeadAlertOverrides` for backward compatibility but are
 * no longer the gating signal — destination presence alone gates each
 * channel. This way clearing a phone field silences SMS without needing a
 * separate checkbox to toggle.
 *
 * Template tokens (`{{lead.name}}`, `{{lead.email}}`, `{{lead.phone}}`,
 * `{{lead.source}}`, `{{lead.url}}`, `{{owner.name}}`) are substituted in
 * email subject, HTML body, and SMS body.
 *
 * Failures never throw — the webhook keeps returning 200 to Meta and we log
 * the failure into `facebook_lead_event_log` from the caller.
 */
export async function notifyNewLead(opts: {
  organizationId: string;
  leadId: string;
}): Promise<NotifyNewLeadResult> {
  const out: NotifyNewLeadResult = {
    ok: true,
    recipientCount: 0,
    results: [],
    errors: [],
  };
  const admin = createAdminClient();

  const { data: leadRow, error: leadErr } = await admin
    .from("lead")
    .select(
      "id, organization_id, owner_id, name, email, phone, source, facebook_field_data, facebook_form_name"
    )
    .eq("id", opts.leadId)
    .maybeSingle<LeadRow>();

  if (leadErr || !leadRow) {
    out.ok = false;
    out.errors.push(leadErr?.message ?? "Lead not found.");
    return out;
  }
  if (leadRow.organization_id !== opts.organizationId) {
    out.ok = false;
    out.errors.push("Lead does not belong to the supplied organization.");
    return out;
  }

  const automation = await loadNewLeadAlertAutomation(admin, opts.organizationId);
  if (!automation.enabled) {
    out.errors.push("Flow disabled");
    return out;
  }

  const recipients = await resolveRecipients(admin, leadRow);
  out.recipientCount = recipients.length;
  if (recipients.length === 0) {
    out.errors.push("No notification recipients (no owner and no team Admin in org).");
    return out;
  }

  const template = automation.template;
  const leadUrl = buildLeadUrl(leadRow.id);

  // Channel-level dedup: even if we resolve N admin user rows, never deliver
  // the same lead alert twice to the same destination email or phone in this
  // dispatch. Lower-cased email and E.164-normalized phone act as the keys.
  const sentEmailAddresses = new Set<string>();
  const sentPhoneNumbers = new Set<string>();

  for (const recipient of recipients) {
    const channels: RecipientChannelResult[] = [];

    const tokens: TemplateTokens = {
      lead: {
        name: leadRow.name ?? "(no name)",
        email: leadRow.email ?? "",
        phone: leadRow.phone ?? "",
        source: leadRow.source ?? "Facebook Lead Ads",
        url: leadUrl,
        formName: leadRow.facebook_form_name ?? "",
        fieldData: leadRow.facebook_field_data ?? [],
      },
      owner: { name: recipient.fullName ?? recipient.email ?? "" },
    };

    if (recipient.emailEnabled && recipient.email) {
      const emailKey = recipient.email.trim().toLowerCase();
      if (sentEmailAddresses.has(emailKey)) {
        channels.push({
          channel: "email",
          ok: true,
          reason: `skipped: duplicate destination ${emailKey}`,
        });
      } else {
        const sgCreds = await getAgencySendGridCredentials({
          organizationId: opts.organizationId,
        });
        if (!sgCreds) {
          channels.push({
            channel: "email",
            ok: false,
            reason: "SendGrid is not configured for this org.",
          });
        } else {
          const subject = renderTemplate(template.email_subject, tokens, "text");
          const html = renderTemplate(template.email_html, tokens, "html");
          const text = htmlToText(html);
          const sent = await sendSendGridMail({
            apiKey: sgCreds.apiKey,
            to: recipient.email,
            from: { email: sgCreds.fromEmail, name: sgCreds.fromName ?? null },
            replyTo: sgCreds.replyTo ?? null,
            subject,
            text,
            html,
          });
          channels.push({
            channel: "email",
            ok: sent.ok,
            reason: sent.ok ? "sent" : `error: ${sent.error}`,
          });
          if (sent.ok) sentEmailAddresses.add(emailKey);
          if (!sent.ok) out.ok = false;
        }
      }
    }

    if (recipient.smsEnabled && recipient.smsPhone) {
      const phoneKey = normalizeE164(recipient.smsPhone) ?? recipient.smsPhone.trim();
      if (sentPhoneNumbers.has(phoneKey)) {
        channels.push({
          channel: "sms",
          ok: true,
          reason: `skipped: duplicate destination ${phoneKey}`,
        });
      } else {
        const twCreds = await getAgencyTwilioCredentials({
          organizationId: opts.organizationId,
        });
        if (!twCreds || !twCreds.fromPhone) {
          channels.push({
            channel: "sms",
            ok: false,
            reason: "Twilio is not configured (or no From phone) for this org.",
          });
        } else {
          try {
            const client = twilio(twCreds.accountSid, twCreds.authToken);
            await client.messages.create({
              from: twCreds.fromPhone,
              to: recipient.smsPhone,
              body: renderTemplate(template.sms_body, tokens, "text").slice(0, 1500),
            });
            channels.push({ channel: "sms", ok: true, reason: "sent" });
            sentPhoneNumbers.add(phoneKey);
          } catch (e) {
            const msg = e instanceof Error ? e.message : "SMS failed";
            channels.push({ channel: "sms", ok: false, reason: `error: ${msg}` });
            out.ok = false;
          }
        }
      }
    }

    out.results.push({
      userId: recipient.userId,
      email: recipient.email,
      channels,
    });
  }

  return out;
}

async function resolveRecipients(
  admin: SupabaseClient,
  lead: LeadRow
): Promise<Recipient[]> {
  const userIds = new Set<string>();

  if (lead.owner_id) {
    userIds.add(lead.owner_id);
  } else if (lead.organization_id) {
    const { data: admins } = await admin
      .from("profiles")
      .select("id, email, role")
      .eq("organization_id", lead.organization_id);

    for (const row of admins ?? []) {
      const role = ((row.role as string | null) ?? "").trim();
      const email = (row.email as string | null) ?? null;
      const isAdminRole =
        role === "super_admin" ||
        role === "admin" ||
        role === "agency_admin" ||
        (email ? isSuperAdminEmail(email) : false);
      if (isAdminRole) userIds.add(row.id as string);
    }
  }

  if (userIds.size === 0) return [];

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .in("id", [...userIds]);

  const { data: prefs } = await admin
    .from("lead_notification_preference")
    .select("user_id, sms_phone, override_email, override_phone")
    .in("user_id", [...userIds]);

  const prefMap = new Map<string, {
    smsPhone: string | null;
    overrideEmail: string | null;
  }>();
  for (const p of prefs ?? []) {
    // Per-user override beats profile.email / profile.phone. sms_phone is kept
    // as a legacy fallback for users who configured the older settings page
    // before the override columns existed.
    const overridePhone = (p.override_phone as string | null)?.trim() || null;
    const legacySms = (p.sms_phone as string | null)?.trim() || null;
    prefMap.set(p.user_id as string, {
      smsPhone: overridePhone ?? legacySms,
      overrideEmail: (p.override_email as string | null)?.trim() || null,
    });
  }

  return (profiles ?? []).map((row) => {
    const id = row.id as string;
    const pref = prefMap.get(id);
    const profileEmail = (row.email as string | null) ?? null;
    const email = pref?.overrideEmail ?? profileEmail;
    const smsPhone = pref?.smsPhone ?? null;
    return {
      userId: id,
      email,
      fullName: (row.full_name as string | null) ?? null,
      // Channel is "enabled" iff a destination is actually configured. No
      // separate boolean toggle — clearing the field silences the channel.
      emailEnabled: Boolean(email),
      smsEnabled: Boolean(smsPhone),
      smsPhone,
    };
  });
}

async function loadNewLeadAlertAutomation(
  admin: SupabaseClient,
  organizationId: string
): Promise<{
  enabled: boolean;
  template: { email_subject: string; email_html: string; sms_body: string };
}> {
  // Primary source of truth — `lead_automation` row keyed by (org, flow_key).
  const { data: autoRow } = await admin
    .from("lead_automation")
    .select("enabled, email_subject, email_html, sms_body")
    .eq("organization_id", organizationId)
    .eq("flow_key", "new_lead_alert")
    .maybeSingle();

  if (autoRow) {
    return {
      enabled: autoRow.enabled !== false,
      template: {
        email_subject:
          (autoRow.email_subject as string) || DEFAULT_TEMPLATE.email_subject,
        email_html:
          (autoRow.email_html as string) || DEFAULT_TEMPLATE.email_html,
        sms_body: (autoRow.sms_body as string) || DEFAULT_TEMPLATE.sms_body,
      },
    };
  }

  // Legacy fallback for any org that hasn't been backfilled yet — keeps the
  // dispatcher working through any partial rollout.
  const { data: tplRow } = await admin
    .from("lead_notification_template")
    .select("email_subject, email_html, sms_body")
    .eq("organization_id", organizationId)
    .maybeSingle();

  return {
    enabled: true,
    template: {
      email_subject:
        (tplRow?.email_subject as string) || DEFAULT_TEMPLATE.email_subject,
      email_html: (tplRow?.email_html as string) || DEFAULT_TEMPLATE.email_html,
      sms_body: (tplRow?.sms_body as string) || DEFAULT_TEMPLATE.sms_body,
    },
  };
}

const DEFAULT_TEMPLATE = {
  email_subject: "New lead: {{lead.name}}",
  email_html:
    '<p>You have a new lead from <strong>{{lead.formName}}</strong>.</p>' +
    '<ul>' +
    '<li><strong>Name:</strong> {{lead.name}}</li>' +
    '<li><strong>Email:</strong> {{lead.email}}</li>' +
    '<li><strong>Phone:</strong> {{lead.phone}}</li>' +
    '<li><strong>Source:</strong> {{lead.source}}</li>' +
    '</ul>' +
    '<p><strong>Form answers:</strong></p>{{lead.answers}}' +
    '<p><a href="{{lead.url}}">Open in CRM</a></p>',
  sms_body:
    "New lead {{lead.name}} ({{lead.source}}). Phone: {{lead.phone}}. Open: {{lead.url}}",
};

type TemplateTokens = {
  lead: {
    name: string;
    email: string;
    phone: string;
    source: string;
    url: string;
    formName: string;
    /**
     * Full Q/A snapshot from the Lead Ad form. Rendered into output by
     * the special `{{lead.answers}}` and `{{lead.answer:key}}` tokens.
     */
    fieldData: StructuredFieldEntry[];
  };
  owner: { name: string };
};

export type RenderFormat = "html" | "text";

/**
 * Lightweight `{{token.path}}` substitution. Unknown tokens render as empty
 * strings rather than echoing the raw `{{...}}` so emails never look broken.
 *
 * Special tokens (Facebook Lead Ads):
 *   - `{{lead.answers}}` — every custom Q/A pair from the lead's form. In
 *     `html` mode this becomes a `<ul>` with `<strong>` labels; in `text`
 *     mode (SMS, plain-text email) it becomes one `Label: value` per line.
 *   - `{{lead.answer:KEY}}` — a single answer looked up by its normalized
 *     snake_case `key` (use the "Discover form fields" panel in the Facebook
 *     integration settings to find the right key for each form).
 */
export function renderTemplate(
  input: string,
  tokens: TemplateTokens,
  format: RenderFormat = "text"
): string {
  return input.replace(
    /\{\{\s*([a-zA-Z][a-zA-Z0-9_.]*)(?::([^}]+))?\s*\}\}/g,
    (_, rawPath: string, rawArg: string | undefined) => {
      const path = String(rawPath);
      const arg = rawArg ? rawArg.trim() : null;

      if (path === "lead.answers" && !arg) {
        return renderStructuredAnswers(tokens.lead.fieldData, format);
      }
      if (path === "lead.answer" && arg) {
        return findFieldDataAnswer(tokens.lead.fieldData, arg) ?? "";
      }
      if (path === "lead.formName") {
        return tokens.lead.formName ?? "";
      }
      const value = lookup(tokens, path);
      return value ?? "";
    }
  );
}

function lookup(obj: unknown, path: string): string | null {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return null;
    }
  }
  if (current == null) return null;
  if (typeof current === "object") return null;
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

function buildLeadUrl(leadId: string): string {
  // Delegates to the shared helper so notification links resolve via the same
  // env-var ladder used by prospect previews and other outbound URLs:
  //   PUBLIC_APP_URL  -> explicit override (e.g. https://zenpho.com)
  //   VERCEL_URL      -> automatic on Vercel (deployment hostname)
  //   localhost:3000  -> last-resort fallback for local dev
  // This prevents the alert SMS/email from ever embedding a `localhost:3000`
  // link in production, which is what happened before the helper was wired in.
  return `${getPublicAppOrigin()}/leads/${leadId}`;
}

function isSuperAdminEmail(email: string): boolean {
  const e = email.trim().toLowerCase();
  return e === SUPER_ADMIN_EMAIL || e.endsWith(`@${SUPER_ADMIN_DOMAIN}`);
}
