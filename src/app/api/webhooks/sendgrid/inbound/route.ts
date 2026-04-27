import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  findOrCreateEmailConversation,
  insertEmailMessage,
} from "@/lib/crm/conversation-email";
import {
  findConversationIdByThreading,
  parseRawHeaderBlock,
} from "@/lib/crm/inbound-email-threading";

/**
 * SendGrid Inbound Parse webhook.
 * URL includes a secret token so only SendGrid can call it:
 *   POST /api/webhooks/sendgrid/inbound?token=<SENDGRID_INBOUND_WEBHOOK_SECRET>
 *
 * SendGrid sends multipart/form-data with fields:
 *   from, to, subject, text, html, headers, envelope, attachments, etc.
 *
 * Required for prospect replies to appear in CRM Conversations:
 * - Enable Inbound Parse in SendGrid (hostname + POST to this URL with token).
 * - Set SENDGRID_INBOUND_WEBHOOK_SECRET on the server to match the `token` query param.
 * - Point MX for that hostname to SendGrid, and set Reply-To on outbound mail to an address
 *   on that hostname so replies are delivered to Inbound Parse (not only to a personal inbox).
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

  const parsed = parseRawHeaderBlock(rawHeaders);
  const inReplyTo =
    parsed["in-reply-to"] ?? extractHeaderLegacy(rawHeaders, "In-Reply-To");
  const references =
    parsed["references"] ?? extractHeaderLegacy(rawHeaders, "References");
  const externalMessageId =
    parsed["message-id"] ?? extractHeaderLegacy(rawHeaders, "Message-ID");

  const supabase = createAdminClient();

  let conversationId: string | null = await findConversationIdByThreading(
    supabase,
    inReplyTo,
    references
  );

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

/** Fallback if parseRawHeaderBlock missed (single-line regex). */
function extractHeaderLegacy(rawHeaders: string, headerName: string): string | null {
  const regex = new RegExp(`^${headerName}:\\s*(.+?)$`, "im");
  const match = rawHeaders.match(regex);
  return match?.[1]?.trim() || null;
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
