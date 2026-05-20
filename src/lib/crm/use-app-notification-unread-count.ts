"use client";

import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatUnreadBadgeCount } from "@/lib/crm/use-conversation-unread-count";

const REFRESH_MS = 10000;

export { formatUnreadBadgeCount };

export function useAppNotificationUnreadCount({
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
      const { count: unread, error } = await supabase
        .from("app_notification")
        .select("id", { count: "exact", head: true })
        .is("read_at", null);

      if (!cancelled && !error) setCount(unread ?? 0);
    };

    const initialLoad = window.setTimeout(() => void load(), 1000);

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void load();
    };

    const interval = window.setInterval(refreshIfVisible, REFRESH_MS);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    const realtimeStart = window.setTimeout(() => {
      if (cancelled) return;
      channel = supabase
        .channel(`app-notification-count-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "app_notification" },
          () => void load()
        )
        .subscribe();
    }, 1750);

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

export async function markAppNotificationsRead() {
  if (!isSupabaseConfigured()) return;
  const supabase = createClient();
  await supabase
    .from("app_notification")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
}
