"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Loader2,
  Mail,
  MessageCircle,
  Send,
  Smartphone,
} from "lucide-react";
import {
  sendConversationMessage,
} from "@/app/(crm)/actions/conversations";

type ConversationThread = {
  id: string;
  contact_name: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  unread_count: number;
};

type MiniMessage = {
  id: string;
  direction: string;
  body: string | null;
  sender_name: string | null;
  created_at: string;
  email_subject?: string | null;
};

type ChannelKind = "email" | "sms";

export default function ProspectConversationPanel({
  contactEmail,
  contactName,
  contactPhone,
}: {
  contactEmail?: string;
  contactName: string;
  contactPhone?: string;
}) {
  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [channelKind, setChannelKind] = useState<ChannelKind | null>(null);
  const [messages, setMessages] = useState<MiniMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const hasEmail = !!contactEmail?.trim();
  const hasPhone = !!contactPhone?.trim();

  const fetchThread = useCallback(async () => {
    if (!hasEmail && !hasPhone) {
      setLoading(false);
      return;
    }

    let foundThread: ConversationThread | null = null;
    let foundMessages: MiniMessage[] = [];
    let foundChannel: ChannelKind | null = null;

    if (hasEmail) {
      try {
        const res = await fetch(
          `/api/conversations/by-email?email=${encodeURIComponent(contactEmail!.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.conversation) {
            foundThread = data.conversation;
            foundMessages = data.messages ?? [];
            foundChannel = "email";
          }
        }
      } catch { /* silent */ }
    }

    if (!foundThread && hasPhone) {
      try {
        const res = await fetch(
          `/api/conversations/by-phone?phone=${encodeURIComponent(contactPhone!.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.conversation) {
            foundThread = data.conversation;
            foundMessages = data.messages ?? [];
            foundChannel = "sms";
          }
        }
      } catch { /* silent */ }
    }

    setThread(foundThread);
    setMessages(foundMessages);
    setChannelKind(foundChannel);
    setLoading(false);
  }, [contactEmail, contactPhone, hasEmail, hasPhone]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!thread || !body.trim()) return;
    setError(null);
    const fd = new FormData();
    fd.set("conversation_id", thread.id);
    fd.set("kind", "external");
    fd.set("body", body);
    startTransition(async () => {
      const res = await sendConversationMessage(fd);
      if ("error" in res && res.error) {
        setError(res.error);
      } else {
        setBody("");
        await fetchThread();
      }
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-white p-3 text-xs text-text-secondary dark:border-zinc-700 dark:bg-zinc-900/50">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Loading conversation…
      </div>
    );
  }

  if (!hasEmail && !hasPhone) return null;

  if (!thread) {
    const EmptyIcon = hasEmail ? Mail : Smartphone;
    const contact = hasEmail ? contactEmail! : contactPhone!;
    const action = hasEmail ? "Send an email" : "Send an SMS";
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/50 p-4 text-center dark:border-zinc-700 dark:bg-zinc-900/30">
        <EmptyIcon className="mx-auto h-5 w-5 text-text-secondary/50" />
        <p className="mt-1.5 text-xs text-text-secondary">
          No conversation with{" "}
          <span className="font-medium text-text-primary">{contact}</span>{" "}
          yet. {action} to start one.
        </p>
      </div>
    );
  }

  const visibleMessages = expanded ? messages : messages.slice(-5);
  const hasMore = messages.length > 5 && !expanded;
  const ChannelIcon = channelKind === "sms" ? Smartphone : Mail;
  const channelLabel = channelKind === "sms" ? "SMS" : "Email";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-accent" />
          <span className="text-xs font-semibold text-text-primary">
            Conversation
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-secondary dark:border-zinc-700 dark:bg-zinc-800">
            <ChannelIcon className="h-3 w-3" />
            {channelLabel}
          </span>
          {thread.unread_count > 0 ? (
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
              {thread.unread_count}
            </span>
          ) : null}
        </div>
        <Link
          href={`/conversations/${thread.id}`}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-accent hover:bg-accent/10"
        >
          Open full thread
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Messages */}
      <div className="max-h-[240px] overflow-y-auto px-3 py-2">
        {messages.length === 0 ? (
          <p className="py-3 text-center text-xs text-text-secondary">
            No messages yet.
          </p>
        ) : (
          <>
            {hasMore ? (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="mb-2 w-full rounded-md bg-surface py-1 text-[11px] font-medium text-text-secondary hover:bg-surface/80 dark:bg-zinc-800"
              >
                Show {messages.length - 5} earlier messages
              </button>
            ) : null}
            <div className="space-y-2">
              {visibleMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.direction === "outbound" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-1.5 text-xs ${
                      m.direction === "outbound"
                        ? "bg-violet-100/80 dark:bg-violet-500/20"
                        : "bg-emerald-100/80 dark:bg-emerald-500/15"
                    }`}
                  >
                    {m.email_subject ? (
                      <p className="mb-0.5 text-[10px] font-semibold opacity-60">
                        {m.email_subject}
                      </p>
                    ) : null}
                    <p className="whitespace-pre-wrap text-text-primary">
                      {(m.body ?? "").length > 200
                        ? `${m.body!.slice(0, 200)}…`
                        : (m.body ?? "")}
                    </p>
                  </div>
                  <span className="mt-0.5 text-[10px] text-text-secondary">
                    {m.sender_name ?? "Unknown"} ·{" "}
                    {new Date(m.created_at).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Mini composer */}
      <form
        onSubmit={handleSend}
        className="border-t border-border px-3 py-2 dark:border-zinc-700"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 500))}
            placeholder={channelKind === "sms" ? "Quick SMS reply…" : "Quick reply…"}
            className="flex-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs placeholder:text-text-secondary/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 dark:border-zinc-700 dark:bg-zinc-800/50"
          />
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="rounded-lg p-1.5 text-accent hover:bg-accent/10 disabled:opacity-40"
            aria-label="Send"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        {error ? (
          <p className="mt-1 text-[11px] text-red-500">{error}</p>
        ) : null}
      </form>
    </div>
  );
}
