"use client";

import { useEffect, useRef, useState } from "react";
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

export type CrmTopBarUser = {
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
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

const THEME_KEY = "crm-theme";

export default function CrmTopBar({
  initialUser,
}: {
  initialUser: CrmTopBarUser | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const wrapRef = useRef<HTMLDivElement>(null);

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

      <Link
        href="/dashboard"
        className="rounded-full p-2 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
      </Link>

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
