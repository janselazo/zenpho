"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  Globe,
  Moon,
  Settings,
  Sun,
  User,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import MoneyJournalTopBarPip from "@/components/app/MoneyJournalTopBarPip";
import {
  MONEY_JOURNAL_HOUR_COMPLETE_BADGE_KEY,
  MONEY_JOURNAL_HOUR_COMPLETE_EVENT,
} from "@/lib/crm/money-journal-types";
import {
  clearMoneyJournalHourCompleteBadge,
  readMoneyJournalHourBellDisplay,
} from "@/lib/crm/money-journal-hour-complete-notify";
import {
  formatUnreadBadgeCount,
  useConversationUnreadCount,
} from "@/lib/crm/use-conversation-unread-count";
import {
  markAppNotificationsRead,
  useAppNotificationUnreadCount,
} from "@/lib/crm/use-app-notification-unread-count";

export type CrmTopBarUser = {
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
};

type AppNotificationPreview = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string | null;
};

function initialsFrom(name: string | null | undefined, email: string | null) {
  if (name?.trim()) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

const THEME_KEY = "crm-theme";

export default function CrmTopBar({
  initialUser,
}: {
  initialUser: CrmTopBarUser | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const wrapRef = useRef<HTMLDivElement>(null);
  const notificationWrapRef = useRef<HTMLDivElement>(null);
  const [appNotifications, setAppNotifications] = useState<AppNotificationPreview[]>([]);
  const [appNotificationsLoading, setAppNotificationsLoading] = useState(false);
  const [journalBell, setJournalBell] = useState(() =>
    readMoneyJournalHourBellDisplay()
  );
  const conversationUnreadCount = useConversationUnreadCount();
  const appNotificationUnreadCount = useAppNotificationUnreadCount();

  useEffect(() => {
    const sync = () => setJournalBell(readMoneyJournalHourBellDisplay());
    sync();
    window.addEventListener(MONEY_JOURNAL_HOUR_COMPLETE_EVENT, sync);
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === MONEY_JOURNAL_HOUR_COMPLETE_BADGE_KEY ||
        e.key === null
      ) {
        sync();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(MONEY_JOURNAL_HOUR_COMPLETE_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) as "light" | "dark" | null;
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
      return;
    }
    setTheme("light");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!notificationOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!notificationWrapRef.current?.contains(e.target as Node)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [notificationOpen]);

  const loadAppNotifications = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setAppNotificationsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("app_notification")
        .select("id, title, body, href, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (!error) {
        setAppNotifications(
          (data ?? []).map((row) => ({
            id: String(row.id),
            title: String(row.title ?? "Notification"),
            body: String(row.body ?? ""),
            href: (row.href as string | null) ?? null,
            read_at: (row.read_at as string | null) ?? null,
            created_at: (row.created_at as string | null) ?? null,
          }))
        );
      }
    } finally {
      setAppNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (notificationOpen) void loadAppNotifications();
  }, [appNotificationUnreadCount, loadAppNotifications, notificationOpen]);

  async function signOut() {
    setOpen(false);
    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        await supabase.auth.signOut();
      }
    } catch {
      /* ignore */
    }
    router.push("/login");
    router.refresh();
  }

  const displayName =
    initialUser?.fullName?.trim() ||
    initialUser?.email?.split("@")[0] ||
    "Account";
  const email = initialUser?.email ?? "";
  const avatarUrl = initialUser?.avatarUrl ?? null;
  const hasConversationUnread = conversationUnreadCount > 0;
  const hasAppNotificationUnread = appNotificationUnreadCount > 0;
  const totalNotificationCount =
    conversationUnreadCount + appNotificationUnreadCount;
  const bellHref = hasConversationUnread ? "/conversations" : "/dashboard";
  const bellLabel = hasConversationUnread
    ? `Notifications — ${conversationUnreadCount} unread conversation${conversationUnreadCount === 1 ? "" : "s"}${hasAppNotificationUnread ? ` and ${appNotificationUnreadCount} app alert${appNotificationUnreadCount === 1 ? "" : "s"}` : ""}`
    : hasAppNotificationUnread
      ? `Notifications — ${appNotificationUnreadCount} app alert${appNotificationUnreadCount === 1 ? "" : "s"}`
    : journalBell.show
      ? `Notifications — ${journalBell.label}`
      : "Notifications";
  const bellInner = (
    <>
      <span className="relative inline-flex shrink-0 rounded-full p-2">
        <Bell className="h-4 w-4" aria-hidden />
        {totalNotificationCount > 0 ? (
          <span
            className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold leading-4 text-white shadow-sm ring-2 ring-white dark:bg-blue-500 dark:ring-zinc-900"
            aria-hidden
          >
            {formatUnreadBadgeCount(totalNotificationCount)}
          </span>
        ) : null}
      </span>
      {journalBell.show && !hasConversationUnread && !hasAppNotificationUnread ? (
        <span className="min-w-0 truncate text-left text-[10px] font-semibold leading-snug text-text-primary dark:text-zinc-100">
          {journalBell.label}
        </span>
      ) : null}
    </>
  );

  return (
    <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center justify-end gap-1 border-b border-border bg-white/95 px-3 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/90 dark:backdrop-blur-md sm:gap-2 sm:px-6">
      <div className="flex items-center gap-1 sm:gap-2">
        <Link
          href="/"
          aria-label="Open marketing website"
          className="rounded-full p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <Globe className="h-4 w-4" aria-hidden />
        </Link>
        <button
          type="button"
          aria-label="Light theme"
          aria-pressed={theme === "light"}
          onClick={() => setTheme("light")}
          className={`rounded-full p-2 transition-colors ${
            theme === "light"
              ? "bg-surface text-text-primary ring-1 ring-border dark:bg-zinc-800 dark:ring-zinc-700"
              : "text-text-secondary hover:bg-surface hover:text-text-primary dark:hover:bg-zinc-800"
          }`}
        >
          <Sun className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Dark theme"
          aria-pressed={theme === "dark"}
          onClick={() => setTheme("dark")}
          className={`rounded-full p-2 transition-colors ${
            theme === "dark"
              ? "bg-surface text-text-primary ring-1 ring-border dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-600"
              : "text-text-secondary hover:bg-surface hover:text-text-primary dark:text-zinc-400 dark:hover:bg-zinc-800"
          }`}
        >
          <Moon className="h-4 w-4" />
        </button>
      </div>

      <MoneyJournalTopBarPip />

      <div className="relative" ref={notificationWrapRef}>
        {hasConversationUnread ? (
          <Link
            href={bellHref}
            className="relative flex max-w-[min(100vw-8rem,16rem)] shrink-0 items-center gap-1 rounded-full py-1 pl-1 pr-2 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 sm:max-w-xs sm:gap-1.5 sm:pr-2.5"
            aria-label={bellLabel}
            onClick={() => clearMoneyJournalHourCompleteBadge()}
          >
            {bellInner}
          </Link>
        ) : (
          <button
            type="button"
            className="relative flex max-w-[min(100vw-8rem,16rem)] shrink-0 items-center gap-1 rounded-full py-1 pl-1 pr-2 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 sm:max-w-xs sm:gap-1.5 sm:pr-2.5"
            aria-label={bellLabel}
            aria-expanded={notificationOpen}
            aria-haspopup="menu"
            onClick={() => {
              clearMoneyJournalHourCompleteBadge();
              setNotificationOpen((v) => !v);
            }}
          >
            {bellInner}
          </button>
        )}

        {notificationOpen && !hasConversationUnread ? (
          <div
            className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            role="menu"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 dark:border-zinc-800">
              <div>
                <p className="text-sm font-semibold text-text-primary dark:text-zinc-100">
                  App notifications
                </p>
                <p className="mt-0.5 text-xs text-text-secondary dark:text-zinc-400">
                  Recent reminders and alerts.
                </p>
              </div>
              {hasAppNotificationUnread ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-accent hover:underline"
                  onClick={async () => {
                    await markAppNotificationsRead();
                    await loadAppNotifications();
                  }}
                >
                  Mark all read
                </button>
              ) : null}
            </div>
            <div className="max-h-96 overflow-auto py-1">
              {appNotificationsLoading ? (
                <p className="px-4 py-3 text-sm text-text-secondary dark:text-zinc-400">
                  Loading notifications...
                </p>
              ) : appNotifications.length === 0 ? (
                <p className="px-4 py-3 text-sm text-text-secondary dark:text-zinc-400">
                  No app notifications yet.
                </p>
              ) : (
                appNotifications.map((notification) => {
                  const content = (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <p className="line-clamp-1 text-sm font-semibold text-text-primary dark:text-zinc-100">
                          {notification.title}
                        </p>
                        {!notification.read_at ? (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-text-secondary dark:text-zinc-400">
                        {notification.body}
                      </p>
                      {notification.created_at ? (
                        <p className="mt-1 text-[11px] text-text-secondary/70 dark:text-zinc-500">
                          {formatNotificationTime(notification.created_at)}
                        </p>
                      ) : null}
                    </>
                  );
                  return notification.href ? (
                    <Link
                      key={notification.id}
                      href={notification.href}
                      role="menuitem"
                      className="block px-4 py-3 transition-colors hover:bg-surface dark:hover:bg-zinc-800"
                      onClick={() => setNotificationOpen(false)}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div
                      key={notification.id}
                      role="menuitem"
                      className="px-4 py-3"
                    >
                      {content}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative ml-1" ref={wrapRef}>
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-2 shadow-sm transition-colors hover:bg-surface/80 dark:bg-zinc-800 dark:hover:bg-zinc-800/90"
        >
          <span className="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full bg-surface dark:bg-zinc-700">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                fill
                className="object-cover"
                sizes="32px"
                unoptimized
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-text-secondary dark:text-zinc-200">
                {initialsFrom(initialUser?.fullName, initialUser?.email ?? null)}
              </span>
            )}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-text-secondary transition-transform dark:text-zinc-400 ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>

        {open ? (
          <div
            className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            role="menu"
          >
            <div className="border-b border-border px-4 py-3 dark:border-zinc-800">
              <p className="truncate text-sm font-semibold text-text-primary dark:text-zinc-100">
                {displayName}
              </p>
              <p className="mt-0.5 truncate text-xs text-text-secondary dark:text-zinc-400">
                {email || "—"}
              </p>
            </div>
            <div className="py-1">
              <Link
                href="/settings"
                role="menuitem"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-surface dark:text-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => setOpen(false)}
              >
                <User className="h-4 w-4 text-text-secondary dark:text-zinc-400" aria-hidden />
                Profile
              </Link>
              <Link
                href="/settings?tab=integrations"
                role="menuitem"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-primary hover:bg-surface dark:text-zinc-100 dark:hover:bg-zinc-800"
                onClick={() => setOpen(false)}
              >
                <Settings className="h-4 w-4 text-text-secondary dark:text-zinc-400" aria-hidden />
                Settings
              </Link>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                onClick={() => void signOut()}
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                Sign out
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
