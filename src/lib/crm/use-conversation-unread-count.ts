"use client";

import { useEffect, useState } from "react";
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

export function useConversationUnreadCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setCount(0);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    const load = async () => {
      const { data, error } = await supabase
        .from("conversation")
        .select("unread_count")
        .gt("unread_count", 0);

      if (!cancelled && !error) setCount(totalUnread(data));
    };

    void load();

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void load();
    };

    const interval = window.setInterval(refreshIfVisible, REFRESH_MS);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    const channel = supabase
      .channel(`conversation-unread-count-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation" },
        () => void load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      void supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
