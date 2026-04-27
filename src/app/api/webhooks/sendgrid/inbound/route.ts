import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { simpleParser } from "mailparser";
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
 *
 * Every call (success or failure) is recorded in `public.sendgrid_inbound_log` so the
 * SendGrid integration settings page can surface inbound activity for diagnostics.
 */
export async function POST(req: NextRequest) {
  const supabase = createAdminClient();

  const secret = process.env["SENDGRID_INBOUND_WEBHOOK_SECRET"]?.trim();
  if (secret) {
    const token = req.nextUrl.searchParams.get("token");
    if (token !== secret) {
      await logInbound(supabase, {
        status: "unauthorized",
        errorMessage:
          token == null
            ? "Missing ?token= query parameter on inbound webhook URL."
            : "?token= query parameter does not match SENDGRID_INBOUND_WEBHOOK_SECRET.",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    await logInbound(supabase, {
      status: "invalid_payload",
      errorMessage:
        err instanceof Error
          ? `formData() failed: ${err.message}`
          : "Invalid multipart payload (could not parse).",
    });
    return NextResponse.json(
      { error: "Invalid multipart payload" },
      { status: 400 }
    );
  }

  let fromRaw = String(formData.get("from") ?? "").trim();
  let subject = String(formData.get("subject") ?? "").trim();
  let textBody = String(formData.get("text") ?? "").trim();
  let rawHeaders = String(formData.get("headers") ?? "");

  // SendGrid Inbound Parse "POST the raw, full MIME message" mode delivers everything in a
  // single `email` field and may omit `text`, `html`, and `headers`. Parse the raw MIME so the
  // webhook works regardless of which mode is configured in SendGrid.
  const rawEmail = String(formData.get("email") ?? "");
  if (rawEmail && (!textBody || !rawHeaders || !fromRaw || !subject)) {
    try {
      const parsedMime = await simpleParser(rawEmail);
      if (!textBody) {
        const t = (parsedMime.text ?? "").trim();
        if (t) {
          textBody = t;
        } else if (parsedMime.html) {
          textBody = stripHtmlToText(parsedMime.html).trim();
        }
      }
      if (!rawHeaders && parsedMime.headerLines?.length) {
        rawHeaders = parsedMime.headerLines.map((h) => h.line).join("\n");
      }
      if (!subject && parsedMime.subject) {
        subject = parsedMime.subject.trim();
      }
      if (!fromRaw && parsedMime.from?.text) {
        fromRaw = parsedMime.from.text.trim();
      }
    } catch {
      // Fall through; we'll log invalid_payload below if there's still nothing usable.
    }
  }
  const headersSnippet = rawHeaders.slice(0, 1000) || null;

  const fromEmail = extractEmail(fromRaw);
  const fromName = extractName(fromRaw) || fromEmail;

  const parsed = parseRawHeaderBlock(rawHeaders);
  const inReplyTo =
    parsed["in-reply-to"] ?? extractHeaderLegacy(rawHeaders, "In-Reply-To");
  const references =
    parsed["references"] ?? extractHeaderLegacy(rawHeaders, "References");
  const externalMessageId =
    parsed["message-id"] ?? extractHeaderLegacy(rawHeaders, "Message-ID");

  if (!fromEmail) {
    await logInbound(supabase, {
      status: "invalid_payload",
      subject: subject || null,
      inReplyTo,
      referencesHeader: references,
      externalMessageId,
      headersSnippet,
      errorMessage: `Missing or unparseable "from" field. Raw value: ${fromRaw.slice(0, 200)}`,
    });
    return NextResponse.json({ error: "Missing from" }, { status: 400 });
  }

  try {
    let conversationId: string | null = await findConversationIdByThreading(
      supabase,
      inReplyTo,
      references
    );
    const threaded = !!conversationId;

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

    await logInbound(supabase, {
      status: threaded ? "threaded" : "new_conversation",
      fromEmail,
      subject: subject || null,
      inReplyTo,
      referencesHeader: references,
      externalMessageId,
      conversationId,
      headersSnippet,
    });

    return NextResponse.json({
      ok: true,
      status: threaded ? "threaded" : "new_conversation",
      conversationId,
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown inbound webhook error.";
    await logInbound(supabase, {
      status: "error",
      fromEmail,
      subject: subject || null,
      inReplyTo,
      referencesHeader: references,
      externalMessageId,
      headersSnippet,
      errorMessage: errorMessage.slice(0, 1000),
    });
    // Return 200 so SendGrid does not retry indefinitely; failure is recorded in the log.
    return NextResponse.json({ ok: false, status: "error", error: errorMessage });
  }
}

/** Insert one row into sendgrid_inbound_log. Never throws — logging must never break the webhook. */
async function logInbound(
  supabase: SupabaseClient,
  row: {
    status:
      | "unauthorized"
      | "invalid_payload"
      | "threaded"
      | "new_conversation"
      | "error"
      | "diagnostic";
    fromEmail?: string | null;
    subject?: string | null;
    inReplyTo?: string | null;
    referencesHeader?: string | null;
    externalMessageId?: string | null;
    conversationId?: string | null;
    errorMessage?: string | null;
    headersSnippet?: string | null;
  }
): Promise<void> {
  try {
    await supabase.from("sendgrid_inbound_log").insert({
      status: row.status,
      from_email: row.fromEmail ?? null,
      subject: row.subject ?? null,
      in_reply_to: row.inReplyTo ?? null,
      references_header: row.referencesHeader ?? null,
      external_message_id: row.externalMessageId ?? null,
      conversation_id: row.conversationId ?? null,
      error_message: row.errorMessage ?? null,
      headers_snippet: row.headersSnippet ?? null,
    });
  } catch {
    // Swallow: observability must never break the production path.
  }
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

/** Last-resort HTML → text fallback when an inbound MIME has no text/plain part. */
function stripHtmlToText(html: string): string {
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
    .replace(/\n{3,}/g, "\n\n");
}
