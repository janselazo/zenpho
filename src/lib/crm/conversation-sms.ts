import type { SupabaseClient } from "@supabase/supabase-js";
import twilio from "twilio";
import { getAgencyTwilioCredentials } from "@/lib/twilio/agency-credentials";

export type FindOrCreateSmsConversationResult = {
  conversationId: string;
  created: boolean;
};

/**
 * Normalize a phone number to a consistent format for matching.
 * Prefer E.164-style values so outbound and inbound Twilio events land in the same thread.
 */
export function normalizeSmsPhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const digits = trimmed.replace(/[^\d]/g, "");
  if (trimmed.startsWith("+") && digits) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits || trimmed.replace(/[\s()-]/g, "").trim();
}

/**
 * Find an existing SMS conversation by contact_phone, or create one.
 */
export async function findOrCreateSmsConversation(
  supabase: SupabaseClient,
  opts: {
    contactPhone: string;
    contactName: string;
    leadId?: string | null;
    clientId?: string | null;
  }
): Promise<FindOrCreateSmsConversationResult> {
  const phone = normalizeSmsPhone(opts.contactPhone);

  const { data: existing } = await supabase
    .from("conversation")
    .select("id")
    .eq("channel", "sms")
    .eq("contact_phone", phone)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return { conversationId: existing.id, created: false };
  }

  const insert: Record<string, unknown> = {
    contact_name: opts.contactName.trim() || phone,
    channel: "sms",
    contact_phone: phone,
    last_message_at: new Date().toISOString(),
    unread_count: 0,
  };
  if (opts.leadId) insert.lead_id = opts.leadId;
  if (opts.clientId) insert.client_id = opts.clientId;

  const { data: created, error } = await supabase
    .from("conversation")
    .insert(insert)
    .select("id")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Failed to create SMS conversation");
  }

  return { conversationId: created.id, created: true };
}

/**
 * Insert a conversation_message for an SMS thread and update the parent conversation.
 */
export async function insertSmsMessage(
  supabase: SupabaseClient,
  opts: {
    conversationId: string;
    direction: "inbound" | "outbound";
    body: string;
    senderName: string;
    smsSid?: string | null;
  }
): Promise<string> {
  if (opts.smsSid) {
    const { data: existing } = await supabase
      .from("conversation_message")
      .select("id")
      .eq("sms_sid", opts.smsSid)
      .limit(1)
      .maybeSingle();
    if (existing?.id) return existing.id;
  }

  const { data: msg, error: msgErr } = await supabase
    .from("conversation_message")
    .insert({
      conversation_id: opts.conversationId,
      kind: "external",
      direction: opts.direction,
      body: opts.body,
      sender_name: opts.senderName,
      sms_sid: opts.smsSid ?? null,
    })
    .select("id")
    .single();

  if (msgErr || !msg) {
    throw new Error(msgErr?.message ?? "Failed to insert SMS message");
  }

  const updatePayload: Record<string, unknown> = {
    last_message_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (opts.direction === "inbound") {
    const { data: convo } = await supabase
      .from("conversation")
      .select("unread_count")
      .eq("id", opts.conversationId)
      .single();
    updatePayload.unread_count = ((convo?.unread_count as number) ?? 0) + 1;
  }

  await supabase
    .from("conversation")
    .update(updatePayload)
    .eq("id", opts.conversationId);

  return msg.id;
}

export type SendConversationSmsResult =
  | { ok: true; smsSid: string }
  | { ok: false; error: string };

/**
 * Send an SMS via Twilio, returning the Twilio MessageSid on success.
 */
export async function sendConversationSms(opts: {
  to: string;
  body: string;
  /** Optional public URLs of media attachments (Twilio MMS). Up to 10 entries. */
  mediaUrl?: string[];
}): Promise<SendConversationSmsResult> {
  const creds = await getAgencyTwilioCredentials();
  if (!creds) {
    return {
      ok: false,
      error:
        "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_PHONE, or add Twilio under Settings → Integrations.",
    };
  }
  if (!creds.fromPhone) {
    return {
      ok: false,
      error: "No From phone number configured in Twilio integration settings.",
    };
  }

  const media = (opts.mediaUrl ?? []).filter((u) => !!u?.trim()).slice(0, 10);

  try {
    const client = twilio(creds.accountSid, creds.authToken);
    const message = await client.messages.create({
      from: creds.fromPhone,
      to: opts.to.trim(),
      body: opts.body,
      ...(media.length ? { mediaUrl: media } : {}),
    });
    return { ok: true, smsSid: message.sid };
  } catch (e) {
    const errMsg =
      e && typeof e === "object" && "message" in e
        ? String((e as { message: string }).message)
        : "SMS send failed.";

    // If MMS was rejected by carrier/account, retry without media so the
    // text still reaches the prospect.
    if (
      media.length > 0 &&
      errMsg.toLowerCase().includes("media")
    ) {
      try {
        const client = twilio(creds.accountSid, creds.authToken);
        const retry = await client.messages.create({
          from: creds.fromPhone,
          to: opts.to.trim(),
          body: opts.body,
        });
        return { ok: true, smsSid: retry.sid };
      } catch (e2) {
        const m2 =
          e2 && typeof e2 === "object" && "message" in e2
            ? String((e2 as { message: string }).message)
            : errMsg;
        return { ok: false, error: m2 };
      }
    }

    return { ok: false, error: errMsg };
  }
}
