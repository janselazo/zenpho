import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/conversations/by-phone?phone=+15551234567
 * Returns the most recent SMS conversation and its last 50 messages for the given contact_phone.
 * Used by ProspectConversationPanel for inline mini-conversations.
 */
export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone")?.trim();
  if (!phone) {
    return NextResponse.json({ error: "Missing phone param" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: convo } = await supabase
    .from("conversation")
    .select("id, contact_name, contact_phone, unread_count")
    .eq("channel", "sms")
    .eq("contact_phone", phone)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!convo) {
    return NextResponse.json({ conversation: null, messages: [] });
  }

  const { data: messages } = await supabase
    .from("conversation_message")
    .select("id, direction, body, sender_name, created_at")
    .eq("conversation_id", convo.id)
    .order("created_at", { ascending: true })
    .limit(50);

  return NextResponse.json({
    conversation: convo,
    messages: messages ?? [],
  });
}
