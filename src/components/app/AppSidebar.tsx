"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut, Settings, Store as StoreIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  SIDEBAR_COLLAPSIBLE_SECTIONS,
  SIDEBAR_DASHBOARD_ITEM,
} from "@/lib/crm/app-sidebar-nav";
import {
  formatUnreadBadgeCount,
  useConversationUnreadCount,
} from "@/lib/crm/use-conversation-unread-count";
import SoonBadge from "@/components/crm/prospecting/SoonBadge";

const SIDEBAR_SECTION_STORAGE_PREFIX = "zenpho-sidebar-section-";

function useSidebarSectionOpen(sectionKey: string, defaultOpen = true) {
  const storageKey = `${SIDEBAR_SECTION_STORAGE_PREFIX}${sectionKey}`;
  const [open, setOpenState] = useState(defaultOpen);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === "0") setOpenState(false);
      else if (raw === "1") setOpenState(true);
    } catch {
      /* private mode / quota */
    }
  }, [storageKey]);

  const toggle = useCallback(() => {
    setOpenState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [storageKey]);

  return [open, toggle] as const;
}

function navItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/dashboard/";
  }
  if (href === "/products") {
    return pathname === "/products" || pathname.startsWith("/products/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const conversationUnreadCount = useConversationUnreadCount();

  const [crmOpen, toggleCrm] = useSidebarSectionOpen("crm");
  const [studioOpen, toggleStudio] = useSidebarSectionOpen("studio");
  const [marketingOpen, toggleMarketing] = useSidebarSectionOpen("marketing");
  const [salesOpen, toggleSales] = useSidebarSectionOpen("sales");
  const [reviewsOpen, toggleReviews] = useSidebarSectionOpen("reviews");
  const [referralsOpen, toggleReferrals] = useSidebarSectionOpen("referrals");
  const [reportsOpen, toggleReports] = useSidebarSectionOpen("reports");
  const [agencyOpen, toggleAgency] = useSidebarSectionOpen("agency");

  const sectionToggleByKey: Record<string, () => void> = {
    crm: toggleCrm,
    studio: toggleStudio,
    marketing: toggleMarketing,
    sales: toggleSales,
    reviews: toggleReviews,
    referrals: toggleReferrals,
    reports: toggleReports,
    agency: toggleAgency,
  };

  const sectionOpenByKey: Record<string, boolean> = {
    crm: crmOpen,
    studio: studioOpen,
    marketing: marketingOpen,
    sales: salesOpen,
    reviews: reviewsOpen,
    referrals: referralsOpen,
    reports: reportsOpen,
    agency: agencyOpen,
  };

  async function signOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // not configured
    }
    router.push("/login");
    router.refresh();
  }

  const DashIcon = SIDEBAR_DASHBOARD_ITEM.icon;

  return (
    <aside className="flex w-[15rem] shrink-0 flex-col border-r border-border bg-white dark:border-zinc-800/90 dark:bg-zinc-900 dark:shadow-[inset_-1px_0_0_0_rgba(255,255,255,0.04)]">
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 border-b border-border px-4 py-3.5 dark:border-zinc-800/80"
        >
          <Image
            src="/zenpho-mark.png"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 shrink-0"
          />
          <span className="text-sm font-semibold text-text-primary dark:text-zinc-100">
            Zenpho
          </span>
        </Link>

        <div className="px-2 pt-4">
          <nav className="flex flex-col gap-0.5">
            <NavLink
              href={SIDEBAR_DASHBOARD_ITEM.href}
              active={navItemActive(pathname, SIDEBAR_DASHBOARD_ITEM.href)}
            >
              <DashIcon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              {SIDEBAR_DASHBOARD_ITEM.label}
            </NavLink>
          </nav>
        </div>

        {SIDEBAR_COLLAPSIBLE_SECTIONS.map((section) => (
          <SidebarSection
            key={section.storageKey}
            label={section.label}
            open={sectionOpenByKey[section.storageKey] ?? true}
            onToggle={sectionToggleByKey[section.storageKey] ?? (() => {})}
          >
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = navItemActive(pathname, item.href);
              const showUnread =
                item.badge === "conversations" && conversationUnreadCount > 0;
              return (
                <NavLink
                  key={item.href}
                  href={item.href}
                  active={active}
                  prefetch={item.prefetch}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {showUnread ? <UnreadBadge count={conversationUnreadCount} /> : null}
                  {item.soon ? <SoonBadge className="ml-auto shrink-0" /> : null}
                </NavLink>
              );
            })}
          </SidebarSection>
        ))}
      </div>

      <div className="flex flex-col gap-0.5 border-t border-border p-2 dark:border-zinc-800/80">
        <NavLink href="/store" active={navItemActive(pathname, "/store")}>
          <StoreIcon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          <span className="min-w-0 flex-1 truncate">Store</span>
          <SoonBadge className="ml-auto" />
        </NavLink>
        <NavLink href="/settings" active={navItemActive(pathname, "/settings")}>
          <Settings className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          Settings
        </NavLink>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-text-secondary hover:bg-surface hover:text-text-primary dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Sign out
        </button>
      </div>
    </aside>
  );
}

function UnreadBadge({ count }: { count: number }) {
  return (
    <span
      className="ml-auto inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm ring-1 ring-white/70 dark:bg-blue-500 dark:ring-zinc-900"
      aria-label={`${count} unread conversation${count === 1 ? "" : "s"}`}
    >
      {formatUnreadBadgeCount(count)}
    </span>
  );
}

function SidebarSection({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const sectionId = `sidebar-section-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="px-2 pt-6">
      <button
        type="button"
        id={`${sectionId}-trigger`}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`${sectionId}-nav`}
        className="mb-1.5 flex w-full items-center gap-1 px-3 text-left text-[11px] font-semibold uppercase tracking-widest text-text-secondary/50 hover:text-text-secondary/70 dark:text-zinc-500 dark:hover:text-zinc-400"
      >
        <span className="min-w-0 flex-1">{label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
          aria-hidden
        />
      </button>
      {open ? (
        <nav
          id={`${sectionId}-nav`}
          className="flex flex-col gap-0.5"
          aria-labelledby={`${sectionId}-trigger`}
        >
          {children}
        </nav>
      ) : null}
    </div>
  );
}

function NavLink({
  href,
  active,
  prefetch,
  children,
}: {
  href: string;
  active: boolean;
  prefetch?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch === false ? false : undefined}
      className={`flex w-full min-w-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-accent/10 text-accent dark:bg-blue-500/12 dark:text-blue-400"
          : "text-text-secondary hover:bg-surface hover:text-text-primary dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100"
      }`}
    >
      {children}
    </Link>
  );
}
