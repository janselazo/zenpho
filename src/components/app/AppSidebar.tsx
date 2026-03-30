"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Calendar,
  ChevronDown,
  FileBarChart,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Magnet,
  MessageSquare,
  Settings,
  Timer,
  Users,
  UsersRound,
  Workflow,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PROSPECTING_SECTIONS } from "@/lib/crm/prospecting-nav";
import SoonBadge from "@/components/crm/prospecting/SoonBadge";
import {
  projects as seedProjects,
  type MockProject,
  type PlanStage,
} from "@/lib/crm/mock-data";
import {
  getMergedProjectsList,
  CRM_SUPABASE_PROJECTS_CHANGED_EVENT,
} from "@/lib/crm/projects-storage";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const opportunitiesNav: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
}> = [
  { href: "/leads", label: "Leads", icon: UsersRound },
  { href: "/calendar", label: "Appointments", icon: Calendar },
  { href: "/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/proposals", label: "Proposals", icon: FileText },
];

const workNav = [
  { href: "/products", label: "Products", icon: FolderKanban },
  { href: "/time-tracking", label: "Time Tracking", icon: Timer },
];

const agencyNav = [
  { href: "/team", label: "Team", icon: Users },
  { href: "/capacity", label: "Capacity", icon: BarChart3 },
  { href: "/automations", label: "Automations", icon: Workflow },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/docs", label: "Docs", icon: BookOpen },
  { href: "/lead-magnets", label: "Lead magnets", icon: Magnet },
];

const playbookSection = PROSPECTING_SECTIONS.find((s) => s.slug === "playbook");
const prospectingSectionsWithoutPlaybook = playbookSection
  ? PROSPECTING_SECTIONS.filter((s) => s.slug !== "playbook")
  : PROSPECTING_SECTIONS;
const PlaybookNavIcon = playbookSection?.icon;

function sortSidebarProducts(list: MockProject[]): MockProject[] {
  return [...list].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
  );
}

async function loadSidebarProductRoots(): Promise<MockProject[]> {
  if (!isSupabaseConfigured()) {
    return sortSidebarProducts(getMergedProjectsList());
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return sortSidebarProducts(getMergedProjectsList());
  }
  const { data, error } = await supabase
    .from("project")
    .select("id, title")
    .is("parent_project_id", null)
    .order("title", { ascending: true })
    .limit(75);
  if (error || data === null) {
    return sortSidebarProducts(getMergedProjectsList());
  }
  return data.map((row) => ({
    id: row.id as string,
    title: ((row.title as string) ?? "").trim() || "Untitled",
    plan: "backlog" as PlanStage,
    teamId: "team-general",
    clientId: "",
    color: "#6366f1",
    expectedEndDate: "TBD",
    sprintCount: 0,
    taskCount: 0,
  }));
}

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

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [opportunitiesOpen, toggleOpportunities] =
    useSidebarSectionOpen("opportunities");
  const [workOpen, toggleWork] = useSidebarSectionOpen("work");
  const [prospectingOpen, toggleProspecting] =
    useSidebarSectionOpen("prospecting");
  const [agencyOpen, toggleAgency] = useSidebarSectionOpen("agency");
  const [productsOpen, toggleProducts] = useSidebarSectionOpen("products");
  const [sidebarProducts, setSidebarProducts] = useState(() => seedProjects);

  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      void loadSidebarProductRoots().then((list) => {
        if (!cancelled) setSidebarProducts(list);
      });
    };
    sync();
    window.addEventListener("crm-projects-changed", sync);
    window.addEventListener("storage", sync);
    window.addEventListener(CRM_SUPABASE_PROJECTS_CHANGED_EVENT, sync);
    return () => {
      cancelled = true;
      window.removeEventListener("crm-projects-changed", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener(CRM_SUPABASE_PROJECTS_CHANGED_EVENT, sync);
    };
  }, []);

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

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-white dark:border-zinc-800/90 dark:bg-zinc-900 dark:shadow-[inset_-1px_0_0_0_rgba(255,255,255,0.04)]">
      <div className="flex-1 overflow-y-auto">
        {/* Brand */}
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

        {/* Dashboard + Playbook */}
        <div className="px-2 pt-4">
          <nav className="flex flex-col gap-0.5">
            <NavLink href="/dashboard" active={isActive(pathname, "/dashboard")}>
              <LayoutDashboard className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              Dashboard
            </NavLink>
            {playbookSection && PlaybookNavIcon ? (
              <NavLink
                href={playbookSection.href}
                active={
                  pathname === playbookSection.href ||
                  pathname.startsWith(`${playbookSection.href}/`)
                }
              >
                <PlaybookNavIcon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                {playbookSection.label}
              </NavLink>
            ) : null}
          </nav>
        </div>

        {/* Opportunities */}
        <SidebarSection
          label="Opportunities"
          open={opportunitiesOpen}
          onToggle={toggleOpportunities}
        >
          {opportunitiesNav.map(({ href, label, icon: Icon }) => (
            <NavLink key={href} href={href} active={isActive(pathname, href)}>
              <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              {label}
            </NavLink>
          ))}
        </SidebarSection>

        {/* Work */}
        <SidebarSection
          label="Work"
          open={workOpen}
          onToggle={toggleWork}
        >
          {workNav.map(({ href, label, icon: Icon }) => (
            <NavLink key={href} href={href} active={isActive(pathname, href)}>
              <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              {label}
            </NavLink>
          ))}
        </SidebarSection>

        {/* Prospecting */}
        <SidebarSection
          label="Prospecting"
          open={prospectingOpen}
          onToggle={toggleProspecting}
        >
          {prospectingSectionsWithoutPlaybook.map(({ href, label, icon: Icon, soon }) => (
            <NavLink
              key={href}
              href={href}
              active={pathname === href || pathname.startsWith(`${href}/`)}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{label}</span>
              {soon ? <SoonBadge className="ml-auto" /> : null}
            </NavLink>
          ))}
        </SidebarSection>

        {/* Agency */}
        <SidebarSection label="Agency" open={agencyOpen} onToggle={toggleAgency}>
          {agencyNav.map(({ href, label, icon: Icon }) => (
            <NavLink key={href} href={href} active={isActive(pathname, href)}>
              <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              {label}
            </NavLink>
          ))}
        </SidebarSection>

        {/* Product shortcuts (root rows from Supabase when configured) */}
        <SidebarSection
          label="Products"
          open={productsOpen}
          onToggle={toggleProducts}
        >
          {sidebarProducts.map((p) => (
            <NavLink
              key={p.id}
              href={`/products/${p.id}`}
              active={
                pathname === `/products/${p.id}` ||
                pathname.startsWith(`/products/${p.id}/`)
              }
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span className="truncate">{p.title}</span>
            </NavLink>
          ))}
        </SidebarSection>

      </div>

      {/* Bottom */}
      <div className="flex flex-col gap-0.5 border-t border-border p-2 dark:border-zinc-800/80">
        <NavLink href="/settings" active={isActive(pathname, "/settings")}>
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

function isActive(pathname: string, href: string) {
  if (href === "/products")
    return pathname === "/products" || pathname.startsWith("/products/");
  return pathname === href || pathname.startsWith(`${href}/`);
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
  children: React.ReactNode;
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
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
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
