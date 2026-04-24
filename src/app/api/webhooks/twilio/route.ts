import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { validateTwilioSignature } from "@/lib/twilio/validate-inbound-webhook";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  findOrCreateSmsConversation,
  insertSmsMessage,
} from "@/lib/crm/conversation-sms";

export const dynamic = "force-dynamic";

const PATH = "/api/webhooks/twilio";

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

export async function POST(req: NextRequest) {
  const result = await validateTwilioSignature(req, PATH);
  if (!result.valid) return result.response;

  const { params } = result;
  const from = params.From?.trim() ?? "";
  const body = params.Body?.trim() ?? "";
  const messageSid = params.MessageSid?.trim() ?? "";
  const deliveryStatus = params.MessageStatus?.trim() || params.SmsStatus?.trim() || "";

  // Outbound status callbacks share this endpoint. They confirm queued/sent/delivered/failed
  // states but are not inbound messages, so do not create blank conversation entries.
  if (deliveryStatus && !body) {
    return new NextResponse(EMPTY_TWIML, {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  }

  if (!from) {
    return new NextResponse(EMPTY_TWIML, {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  }

  try {
    const supabase = createAdminClient();

    const { conversationId } = await findOrCreateSmsConversation(supabase, {
      contactPhone: from,
      contactName: from,
    });

    await insertSmsMessage(supabase, {
      conversationId,
      direction: "inbound",
      body: body || "(empty message)",
      senderName: from,
      smsSid: messageSid || null,
    });
  } catch {
    // Still return 200 so Twilio does not retry endlessly
  }

  return new NextResponse(EMPTY_TWIML, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}
