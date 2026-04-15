import ConversationsView from "@/components/crm/ConversationsView";
import { conversationPreviewById } from "@/lib/crm/conversationPreviews";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="p-8">
        <h1 className="heading-display text-2xl font-bold">Conversations</h1>
        <p className="mt-2 text-text-secondary">Configure Supabase to load CRM.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: conversations, error } = await supabase
    .from("conversation")
    .select("id, contact_name, channel, contact_email, contact_phone, last_message_at, unread_count")
    .order("last_message_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className="p-8">
        <h1 className="heading-display text-2xl font-bold text-text-primary">
          Conversations
        </h1>
        <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          {error.message}. Apply{" "}
          <code className="font-mono text-xs">supabase/migrations</code>.
        </p>
      </div>
    );
  }

  const list = conversations ?? [];
  const ids = list.map((c) => c.id);
  const previews = await conversationPreviewById(supabase, ids);

  const items = list.map((c) => ({
    id: c.id,
    contact_name: c.contact_name,
    channel: c.channel,
    last_message_at: c.last_message_at,
    unread_count: c.unread_count ?? 0,
    preview: previews[c.id] ?? null,
  }));

  return (
    <div className="p-8">
      <ConversationsView
        conversations={items}
        activeConversationId={null}
        activeConversation={null}
        messages={[]}
      />
    </div>
  );
}
