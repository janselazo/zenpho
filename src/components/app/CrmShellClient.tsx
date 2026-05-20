"use client";

import { useEffect, useState } from "react";
import AppSidebar from "@/components/app/AppSidebar";
import CrmTopBar, { type CrmTopBarUser } from "@/components/app/CrmTopBar";
import type { CrmSidebarBranding } from "@/lib/crm/organization-branding";
import AppNotificationToasts from "@/components/crm/AppNotificationToasts";
import NewLeadToasts from "@/components/crm/NewLeadToasts";
import { useConversationUnreadCount } from "@/lib/crm/use-conversation-unread-count";

export default function CrmShellClient({
  children,
  configured,
  initialUser,
  sidebarBranding,
}: {
  children: React.ReactNode;
  configured: boolean;
  initialUser: CrmTopBarUser | null;
  sidebarBranding: CrmSidebarBranding;
}) {
  const conversationUnreadCount = useConversationUnreadCount({
    enabled: configured,
  });
  const [loadRealtimeToasts, setLoadRealtimeToasts] = useState(false);

  useEffect(() => {
    if (!configured) return;
    const start = () => setLoadRealtimeToasts(true);
    const id = window.setTimeout(start, 2500);

    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
    };
  }, [configured]);

  return (
    <>
      <AppSidebar
        conversationUnreadCount={conversationUnreadCount}
        branding={sidebarBranding}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <CrmTopBar
          conversationUnreadCount={conversationUnreadCount}
          initialUser={initialUser}
        />
        <div className="flex-1 overflow-auto dark:bg-transparent">{children}</div>
      </div>
      {configured && loadRealtimeToasts ? (
        <>
          <NewLeadToasts />
          <AppNotificationToasts />
        </>
      ) : null}
    </>
  );
}
