import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  findOrCreateEmailConversation,
  insertEmailMessage,
} from "@/lib/crm/conversation-email";

/**
 * SendGrid Inbound Parse webhook.
 * URL includes a secret token so only SendGrid can call it:
 *   POST /api/webhooks/sendgrid/inbound?token=<SENDGRID_INBOUND_WEBHOOK_SECRET>
 *
 * SendGrid sends multipart/form-data with fields:
 *   from, to, subject, text, html, headers, envelope, attachments, etc.
 */
export async function POST(req: NextRequest) {
  const secret = process.env["SENDGRID_INBOUND_WEBHOOK_SECRET"]?.trim();
  if (secret) {
    const token = req.nextUrl.searchParams.get("token");
    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart payload" },
      { status: 400 }
    );
  }

  const fromRaw = String(formData.get("from") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const textBody = String(formData.get("text") ?? "").trim();
  const rawHeaders = String(formData.get("headers") ?? "");

  const fromEmail = extractEmail(fromRaw);
  const fromName = extractName(fromRaw) || fromEmail;

  if (!fromEmail) {
    return NextResponse.json({ error: "Missing from" }, { status: 400 });
  }

  const inReplyTo = extractHeader(rawHeaders, "In-Reply-To");
  const references = extractHeader(rawHeaders, "References");
  const externalMessageId = extractHeader(rawHeaders, "Message-ID");

  const supabase = createAdminClient();

  let conversationId: string | null = null;

  if (inReplyTo) {
    const { data: threadMatch } = await supabase
      .from("conversation_message")
      .select("conversation_id")
      .eq("email_message_id", inReplyTo)
      .limit(1)
      .maybeSingle();
    conversationId = (threadMatch?.conversation_id as string) ?? null;
  }

  if (!conversationId && references) {
    const refIds = references
      .split(/\s+/)
      .filter((r) => r.startsWith("<") && r.endsWith(">"));
    for (const refId of refIds.reverse()) {
      const { data: refMatch } = await supabase
        .from("conversation_message")
        .select("conversation_id")
        .eq("email_message_id", refId)
        .limit(1)
        .maybeSingle();
      if (refMatch?.conversation_id) {
        conversationId = refMatch.conversation_id as string;
        break;
      }
    }
  }

  if (!conversationId) {
    const result = await findOrCreateEmailConversation(supabase, {
      contactEmail: fromEmail,
      contactName: fromName,
    });
    conversationId = result.conversationId;
  }

  await insertEmailMessage(supabase, {
    conversationId,
    direction: "inbound",
    body: textBody || "(no text content)",
    senderName: fromName,
    emailSubject: subject || null,
    emailMessageId: externalMessageId || null,
    emailInReplyTo: inReplyTo || null,
  });

  return NextResponse.json({ ok: true });
}

function extractEmail(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  if (match) return match[1].toLowerCase();
  if (raw.includes("@")) return raw.split(/\s/)[0].toLowerCase();
  return "";
}

function extractName(raw: string): string {
  const match = raw.match(/^([^<]+)</);
  if (match) return match[1].trim().replace(/^"|"$/g, "");
  return "";
}

function extractHeader(
  rawHeaders: string,
  headerName: string
): string | null {
  const regex = new RegExp(
    `^${headerName}:\\s*(.+?)$`,
    "im"
  );
  const match = rawHeaders.match(regex);
  return match?.[1]?.trim() || null;
}
