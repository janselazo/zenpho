"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getLastEmailMessageId,
  getThreadSubject,
  sendConversationEmail,
  type ConversationEmailAttachment,
} from "@/lib/crm/conversation-email";
import { sendConversationSms } from "@/lib/crm/conversation-sms";

const MAX_BODY = 4000;
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

type UploadedAttachment = {
  name: string;
  size_kb: number;
  url: string;
  contentType: string;
  contentBase64: string;
};

async function uploadComposerAttachment(opts: {
  conversationId: string;
  base64: string;
  filename: string;
  contentType: string;
}): Promise<{ ok: true; attachment: UploadedAttachment } | { ok: false; error: string }> {
  let buf: Buffer;
  try {
    buf = Buffer.from(opts.base64, "base64");
  } catch {
    return { ok: false, error: "Attachment is not valid base64." };
  }
  if (buf.length === 0) {
    return { ok: false, error: "Attachment is empty." };
  }
  if (buf.length > MAX_ATTACHMENT_BYTES) {
    return { ok: false, error: "Attachment exceeds 25 MB." };
  }

  const safeName = opts.filename.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 200) || "attachment.bin";
  const ext = safeName.includes(".") ? safeName.split(".").pop() ?? "bin" : "bin";
  const path = `conversations/${opts.conversationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const admin = createAdminClient();
  const { error: upErr } = await admin.storage
    .from("conversation-attachments")
    .upload(path, buf, {
      contentType: opts.contentType || "application/octet-stream",
      upsert: false,
    });
  if (upErr) return { ok: false, error: `Upload failed: ${upErr.message}` };

  const { data: { publicUrl } } = admin.storage
    .from("conversation-attachments")
    .getPublicUrl(path);
  if (!publicUrl) {
    return { ok: false, error: "Could not generate public URL for attachment." };
  }

  return {
    ok: true,
    attachment: {
      name: safeName,
      size_kb: Math.max(1, Math.round(buf.length / 1024)),
      url: publicUrl,
      contentType: opts.contentType || "application/octet-stream",
      contentBase64: buf.toString("base64"),
    },
  };
}

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
  const isVoice = String(formData.get("is_voice") ?? "") === "1";
  const attachmentBase64 = String(formData.get("attachment_base64") ?? "").trim();
  const attachmentName = String(formData.get("attachment_name") ?? "").trim();
  const attachmentType = String(formData.get("attachment_type") ?? "").trim();

  if (!conversationId) return { error: "Missing conversation." };

  const trimmedBody = rawBody.slice(0, MAX_BODY).trim();
  const hasAttachment = Boolean(attachmentBase64 && attachmentName);

  if (!trimmedBody && !hasAttachment) {
    return { error: "Write a message or attach a file first." };
  }

  let uploaded: UploadedAttachment | null = null;
  if (hasAttachment) {
    const up = await uploadComposerAttachment({
      conversationId,
      base64: attachmentBase64,
      filename: attachmentName,
      contentType: attachmentType,
    });
    if (!up.ok) return { error: up.error };
    uploaded = up.attachment;
  }

  // For voice clips we always show "[voice]" as the text body so the existing
  // playable bubble UI in ConversationsView kicks in. Plain attachments fall
  // back to the file name when no message was typed.
  const body = isVoice
    ? "[voice]"
    : trimmedBody || (uploaded ? uploaded.name : "");
  if (!body) return { error: "Write a message or attach a file first." };

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
      mediaUrl: uploaded ? [uploaded.url] : undefined,
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

    const emailAttachments: ConversationEmailAttachment[] | undefined = uploaded
      ? [
          {
            filename: uploaded.name,
            contentBase64: uploaded.contentBase64,
            contentType: uploaded.contentType,
          },
        ]
      : undefined;

    const sent = await sendConversationEmail({
      to: contactEmail,
      subject: replySubject,
      text: body,
      html: htmlBody,
      inReplyTo: lastMid,
      references: lastMid,
      attachments: emailAttachments,
    });

    if (!sent.ok) return { error: sent.error };

    emailMessageId = sent.messageId;
    emailInReplyTo = lastMid;
  }

  const attachmentJson = uploaded
    ? {
        name: uploaded.name,
        size_kb: uploaded.size_kb,
        url: uploaded.url,
        content_type: uploaded.contentType,
      }
    : null;

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
    attachment: attachmentJson,
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
