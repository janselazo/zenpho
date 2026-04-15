"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  generateMessageId,
  getLastEmailMessageId,
  getThreadSubject,
  sendConversationEmail,
} from "@/lib/crm/conversation-email";
import { sendConversationSms } from "@/lib/crm/conversation-sms";

const MAX_BODY = 4000;

export async function sendConversationMessage(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const conversationId = String(formData.get("conversation_id") ?? "").trim();
  const rawBody = String(formData.get("body") ?? "");
  const kindRaw = String(formData.get("kind") ?? "external").trim();
  const kind = kindRaw === "internal" ? "internal" : "external";
  const emailSubject = String(formData.get("email_subject") ?? "").trim() || null;

  if (!conversationId) return { error: "Missing conversation." };

  const body = rawBody.slice(0, MAX_BODY).trim();
  if (!body) return { error: "Write a message first." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const senderName =
    profile?.full_name?.trim() || user.email?.split("@")[0] || "You";

  const { data: convo } = await supabase
    .from("conversation")
    .select("channel, contact_email, contact_phone")
    .eq("id", conversationId)
    .single();

  const isEmail =
    convo?.channel === "email" &&
    kind === "external" &&
    (convo.contact_email as string | null)?.trim();

  const isSms =
    convo?.channel === "sms" &&
    kind === "external" &&
    (convo.contact_phone as string | null)?.trim();

  let emailMessageId: string | null = null;
  let emailInReplyTo: string | null = null;
  let smsSid: string | null = null;

  if (isSms) {
    const contactPhone = (convo.contact_phone as string).trim();
    const sent = await sendConversationSms({
      to: contactPhone,
      body,
    });
    if (!sent.ok) return { error: sent.error };
    smsSid = sent.smsSid;
  }

  if (isEmail) {
    const contactEmail = (convo.contact_email as string).trim();
    const lastMid = await getLastEmailMessageId(supabase, conversationId);
    const subject =
      emailSubject ??
      (await getThreadSubject(supabase, conversationId)) ??
      "Message from Zenpho";

    const replySubject = lastMid ? `Re: ${subject.replace(/^Re:\s*/i, "")}` : subject;
    const htmlBody = `<p>${body.replace(/\n/g, "<br/>")}</p>`;

    const sent = await sendConversationEmail({
      to: contactEmail,
      subject: replySubject,
      text: body,
      html: htmlBody,
      inReplyTo: lastMid,
      references: lastMid,
    });

    if (!sent.ok) return { error: sent.error };

    emailMessageId = sent.messageId;
    emailInReplyTo = lastMid;
  }

  const { error: msgErr } = await supabase.from("conversation_message").insert({
    conversation_id: conversationId,
    kind,
    direction: "outbound",
    body,
    sender_name: senderName,
    email_message_id: emailMessageId,
    email_subject: emailSubject,
    email_in_reply_to: emailInReplyTo,
    sms_sid: smsSid,
  });

  if (msgErr) return { error: msgErr.message };

  const { error: convErr } = await supabase
    .from("conversation")
    .update({
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  if (convErr) return { error: convErr.message };

  revalidatePath("/conversations");
  revalidatePath(`/conversations/${conversationId}`);
  return { ok: true as const };
}

export async function markConversationRead(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("conversation")
    .update({ unread_count: 0 })
    .eq("id", conversationId);

  if (error) return { error: error.message };

  revalidatePath("/conversations");
  revalidatePath(`/conversations/${conversationId}`);
  return { ok: true as const };
}
