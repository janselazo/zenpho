import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getAgencySendGridCredentials } from "@/lib/sendgrid/agency-credentials";
import { sendSendGridMail } from "@/lib/sendgrid/mail-send";

/**
 * Deterministic Message-ID header for outbound emails.
 * Using uuid + domain keeps it unique and valid per RFC 5322.
 */
export function generateMessageId(domain?: string): string {
  const d = domain ?? "zenpho.com";
  const id = crypto.randomUUID();
  return `<${id}@${d}>`;
}

/**
 * Extract a bare domain from an email address (for Message-ID generation).
 */
function domainFromEmail(email: string): string {
  const parts = email.split("@");
  return parts[1] ?? "zenpho.com";
}

export type FindOrCreateConversationResult = {
  conversationId: string;
  created: boolean;
};

/**
 * Find an existing email conversation by contact_email, or create one.
 * Returns the conversation id and whether it was newly created.
 */
export async function findOrCreateEmailConversation(
  supabase: SupabaseClient,
  opts: {
    contactEmail: string;
    contactName: string;
    leadId?: string | null;
    clientId?: string | null;
  }
): Promise<FindOrCreateConversationResult> {
  const email = opts.contactEmail.trim().toLowerCase();

  const { data: existing } = await supabase
    .from("conversation")
    .select("id")
    .eq("channel", "email")
    .ilike("contact_email", email)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return { conversationId: existing.id, created: false };
  }

  const insert: Record<string, unknown> = {
    contact_name: opts.contactName.trim() || email,
    channel: "email",
    contact_email: email,
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
    throw new Error(error?.message ?? "Failed to create conversation");
  }

  return { conversationId: created.id, created: true };
}

/**
 * Insert a conversation_message with email metadata and update the parent conversation timestamp.
 */
export async function insertEmailMessage(
  supabase: SupabaseClient,
  opts: {
    conversationId: string;
    direction: "inbound" | "outbound";
    body: string;
    senderName: string;
    emailSubject?: string | null;
    emailMessageId?: string | null;
    emailInReplyTo?: string | null;
    attachment?: Record<string, unknown> | null;
  }
): Promise<string> {
  const { data: msg, error: msgErr } = await supabase
    .from("conversation_message")
    .insert({
      conversation_id: opts.conversationId,
      kind: "external",
      direction: opts.direction,
      body: opts.body,
      sender_name: opts.senderName,
      email_message_id: opts.emailMessageId ?? null,
      email_subject: opts.emailSubject ?? null,
      email_in_reply_to: opts.emailInReplyTo ?? null,
      attachment: opts.attachment ?? null,
    })
    .select("id")
    .single();

  if (msgErr || !msg) {
    throw new Error(msgErr?.message ?? "Failed to insert message");
  }

  const updatePayload: Record<string, unknown> = {
    last_message_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (opts.direction === "inbound") {
    // Increment unread_count via raw SQL is not available here;
    // fetch current count and add 1.
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

/**
 * Get the last outbound email_message_id for threading (In-Reply-To / References headers).
 */
export async function getLastEmailMessageId(
  supabase: SupabaseClient,
  conversationId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("conversation_message")
    .select("email_message_id")
    .eq("conversation_id", conversationId)
    .not("email_message_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.email_message_id as string) ?? null;
}

/**
 * Get the email subject from the first message in this thread (for display / reply subjects).
 */
export async function getThreadSubject(
  supabase: SupabaseClient,
  conversationId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("conversation_message")
    .select("email_subject")
    .eq("conversation_id", conversationId)
    .not("email_subject", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (data?.email_subject as string) ?? null;
}

export type SendConversationEmailResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

/**
 * Send an email via SendGrid (preferred) or Resend (fallback), returning the generated Message-ID.
 */
export async function sendConversationEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
  inReplyTo?: string | null;
  references?: string | null;
}): Promise<SendConversationEmailResult> {
  const sgCreds = await getAgencySendGridCredentials();
  const messageId = generateMessageId(
    sgCreds ? domainFromEmail(sgCreds.fromEmail) : undefined
  );

  const threadingHeaders: Record<string, string> = {
    "Message-ID": messageId,
  };
  if (opts.inReplyTo) {
    threadingHeaders["In-Reply-To"] = opts.inReplyTo;
    threadingHeaders["References"] = opts.references ?? opts.inReplyTo;
  }

  if (sgCreds) {
    const result = await sendSendGridMail({
      apiKey: sgCreds.apiKey,
      to: opts.to,
      from: { email: sgCreds.fromEmail, name: sgCreds.fromName },
      replyTo: sgCreds.replyTo,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      headers: threadingHeaders,
    });
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, messageId };
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  const resendFrom = process.env.RESEND_FROM_EMAIL?.trim();
  if (!resendKey || !resendFrom) {
    return {
      ok: false,
      error:
        "No email provider configured. Set SENDGRID_API_KEY + SENDGRID_FROM_EMAIL, or RESEND_API_KEY + RESEND_FROM_EMAIL.",
    };
  }

  const resend = new Resend(resendKey);
  const { error } = await resend.emails.send({
    from: resendFrom,
    to: opts.to.trim(),
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    headers: threadingHeaders,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, messageId };
}
