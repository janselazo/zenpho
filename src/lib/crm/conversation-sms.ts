import type { SupabaseClient } from "@supabase/supabase-js";
import twilio from "twilio";
import { fetchCurrentOrganizationId } from "@/lib/organization";
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
    organizationId?: string | null;
  }
): Promise<FindOrCreateSmsConversationResult> {
  const phone = normalizeSmsPhone(opts.contactPhone);

  let orgId =
    opts.organizationId?.trim() ||
    (await fetchCurrentOrganizationId(supabase)) ||
    null;
  if (!orgId) {
    throw new Error("Missing organization scope for SMS conversation.");
  }
  const ownerId = await resolveConversationOwner(supabase, {
    leadId: opts.leadId,
    clientId: opts.clientId,
  });

  const { data: existing } = await supabase
    .from("conversation")
    .select("id, lead_id")
    .eq("channel", "sms")
    .eq("contact_phone", phone)
    .eq("organization_id", orgId)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    if (opts.leadId && !existing.lead_id) {
      await supabase
        .from("conversation")
        .update({ lead_id: opts.leadId })
        .eq("id", existing.id);
    }
    return { conversationId: existing.id, created: false };
  }

  const insert: Record<string, unknown> = {
    organization_id: orgId,
    contact_name: opts.contactName.trim() || phone,
    channel: "sms",
    contact_phone: phone,
    last_message_at: new Date().toISOString(),
    unread_count: 0,
  };
  if (ownerId) insert.owner_id = ownerId;
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

  const { data: convoMeta, error: convoLookupErr } = await supabase
    .from("conversation")
    .select("organization_id, owner_id")
    .eq("id", opts.conversationId)
    .maybeSingle();

  if (convoLookupErr || !convoMeta?.organization_id) {
    throw new Error(convoLookupErr?.message ?? "Conversation not found for SMS message insert.");
  }

  const { data: msg, error: msgErr } = await supabase
    .from("conversation_message")
    .insert({
      organization_id: convoMeta.organization_id,
      owner_id: convoMeta.owner_id,
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

async function resolveConversationOwner(
  supabase: SupabaseClient,
  opts: { leadId?: string | null; clientId?: string | null }
): Promise<string | null> {
  if (opts.leadId) {
    const { data } = await supabase
      .from("lead")
      .select("owner_id")
      .eq("id", opts.leadId)
      .maybeSingle();
    if (typeof data?.owner_id === "string") return data.owner_id;
  }
  if (opts.clientId) {
    const { data } = await supabase
      .from("client")
      .select("owner_id")
      .eq("id", opts.clientId)
      .maybeSingle();
    if (typeof data?.owner_id === "string") return data.owner_id;
  }
  return null;
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
  organizationId?: string | null;
}): Promise<SendConversationSmsResult> {
  const creds = await getAgencyTwilioCredentials({
    organizationId: opts.organizationId,
  });
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
