"use client";

import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const REFRESH_MS = 10000;

type ConversationUnreadRow = {
  unread_count: number | null;
};

export function formatUnreadBadgeCount(count: number) {
  return count > 99 ? "99+" : String(count);
}

function totalUnread(rows: ConversationUnreadRow[] | null) {
  return (rows ?? []).reduce((sum, row) => sum + (row.unread_count ?? 0), 0);
}

export function useConversationUnreadCount({
  enabled = true,
}: {
  enabled?: boolean;
} = {}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured()) {
      setCount(0);
      return;
    }

    let cancelled = false;
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;

    const load = async () => {
      const { data, error } = await supabase
        .from("conversation")
        .select("unread_count")
        .gt("unread_count", 0);

      if (!cancelled && !error) setCount(totalUnread(data));
    };

    const initialLoad = window.setTimeout(() => void load(), 750);

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void load();
    };

    const interval = window.setInterval(refreshIfVisible, REFRESH_MS);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    const realtimeStart = window.setTimeout(() => {
      if (cancelled) return;
      channel = supabase
        .channel(`conversation-unread-count-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "conversation" },
          () => void load()
        )
        .subscribe();
    }, 1500);

    return () => {
      cancelled = true;
      window.clearTimeout(initialLoad);
      window.clearTimeout(realtimeStart);
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [enabled]);

  return count;
}
