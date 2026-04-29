import { notFound } from "next/navigation";
import ConversationsView, {
  type MessageRow,
} from "@/components/crm/ConversationsView";
import { conversationBusinessLogoById } from "@/lib/crm/conversation-business-logos";
import { conversationPreviewById } from "@/lib/crm/conversationPreviews";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ConversationThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <h1 className="heading-display text-2xl font-bold">Conversations</h1>
        <p className="mt-2 text-text-secondary">Configure Supabase to load CRM.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: conversations, error: listError } = await supabase
    .from("conversation")
    .select("id, contact_name, channel, contact_email, contact_phone, lead_id, last_message_at, unread_count")
    .order("last_message_at", { ascending: false })
    .limit(200);

  if (listError) {
    return (
      <div className="p-8">
        <h1 className="heading-display text-2xl font-bold text-text-primary">
          Conversations
        </h1>
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          {listError.message}. Apply{" "}
          <code className="font-mono text-xs">supabase/migrations</code>.
        </p>
      </div>
    );
  }

  const list = conversations ?? [];
  const active = list.find((c) => c.id === id);
  if (!active) notFound();

  const ids = list.map((c) => c.id);
  const [previews, logoById] = await Promise.all([
    conversationPreviewById(supabase, ids),
    conversationBusinessLogoById(supabase, list),
  ]);

  const items = list.map((c) => ({
    id: c.id,
    contact_name: c.contact_name,
    channel: c.channel,
    last_message_at: c.last_message_at,
    unread_count: c.unread_count ?? 0,
    logo_url: logoById[c.id] ?? null,
    preview: previews[c.id] ?? null,
  }));

  const { data: rawMessages, error: msgError } = await supabase
    .from("conversation_message")
    .select(
      "id, conversation_id, kind, direction, body, sender_name, sender_avatar_url, attachment, created_at, email_subject, email_message_id"
    )
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (msgError) {
    return (
      <div className="p-8">
        <h1 className="heading-display text-2xl font-bold text-text-primary">
          Conversations
        </h1>
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          {msgError.message}
        </p>
      </div>
    );
  }

  const messages: MessageRow[] = (rawMessages ?? []).map((m) => ({
    id: m.id,
    conversation_id: m.conversation_id,
    kind: m.kind,
    direction: m.direction,
    body: m.body,
    sender_name: m.sender_name,
    sender_avatar_url: m.sender_avatar_url,
    attachment: m.attachment as MessageRow["attachment"],
    created_at: m.created_at,
    email_subject: (m as Record<string, unknown>).email_subject as string | null,
    email_message_id: (m as Record<string, unknown>).email_message_id as string | null,
  }));

  return (
    <div className="p-8">
      <ConversationsView
        conversations={items}
        activeConversationId={id}
        activeConversation={{
          id: active.id,
          contact_name: active.contact_name,
          channel: active.channel,
          contact_email: (active as Record<string, unknown>).contact_email as string | null,
          contact_phone: (active as Record<string, unknown>).contact_phone as string | null,
          logo_url: logoById[active.id] ?? null,
        }}
        messages={messages}
      />
    </div>
  );
}
