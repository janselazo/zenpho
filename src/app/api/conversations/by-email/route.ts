import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/conversations/by-email?email=foo@bar.com
 * Returns the most recent email conversation and its last 10 messages for the given contact_email.
 * Used by ProspectConversationPanel for inline mini-conversations.
 */
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Missing email param" }, { status: 400 });
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
    .select("id, contact_name, contact_email, unread_count")
    .eq("channel", "email")
    .ilike("contact_email", email)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!convo) {
    return NextResponse.json({ conversation: null, messages: [] });
  }

  const { data: messages } = await supabase
    .from("conversation_message")
    .select("id, direction, body, sender_name, created_at, email_subject")
    .eq("conversation_id", convo.id)
    .order("created_at", { ascending: true })
    .limit(50);

  return NextResponse.json({
    conversation: convo,
    messages: messages ?? [],
  });
}
