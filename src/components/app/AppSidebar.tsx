"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  ChevronDown,
  FileBarChart,
  FileText,
  FolderKanban,
  Handshake,
  LayoutDashboard,
  LogOut,
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
import { projects as seedProjects } from "@/lib/crm/mock-data";
import { getMergedProjectsList } from "@/lib/crm/projects-storage";

const opportunitiesNav: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
}> = [
  { href: "/leads", label: "Leads", icon: UsersRound },
  { href: "/deals", label: "Deals", icon: Handshake },
  { href: "/proposals", label: "Proposals", icon: FileText },
  { href: "/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/calendar", label: "Appointments", icon: Calendar },
];

const workNav = [
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/time-tracking", label: "Time Tracking", icon: Timer },
];

const agencyNav = [
  { href: "/team", label: "Team", icon: Users },
  { href: "/capacity", label: "Capacity", icon: BarChart3 },
  { href: "/automations", label: "Automations", icon: Workflow },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/docs", label: "Docs", icon: BookOpen },
];

const playbookSection = PROSPECTING_SECTIONS.find((s) => s.slug === "playbook");
const prospectingSectionsWithoutPlaybook = playbookSection
  ? PROSPECTING_SECTIONS.filter((s) => s.slug !== "playbook")
  : PROSPECTING_SECTIONS;
const PlaybookNavIcon = playbookSection?.icon;

export default function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [sidebarProjects, setSidebarProjects] =
    useState(() => seedProjects);

  useEffect(() => {
    const sync = () => {
      const list = getMergedProjectsList();
      setSidebarProjects(
        [...list].sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
        )
      );
    };
    sync();
    window.addEventListener("crm-projects-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("crm-projects-changed", sync);
      window.removeEventListener("storage", sync);
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
        <NavGroup label="Opportunities">
          {opportunitiesNav.map(({ href, label, icon: Icon }) => (
            <NavLink key={href} href={href} active={isActive(pathname, href)}>
              <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              {label}
            </NavLink>
          ))}
        </NavGroup>

        {/* Work */}
        <NavGroup label="Work">
          {workNav.map(({ href, label, icon: Icon }) => (
            <NavLink key={href} href={href} active={isActive(pathname, href)}>
              <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              {label}
            </NavLink>
          ))}
        </NavGroup>

        {/* Prospecting */}
        <NavGroup label="Prospecting">
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
        </NavGroup>

        {/* Agency */}
        <NavGroup label="Agency">
          {agencyNav.map(({ href, label, icon: Icon }) => (
            <NavLink key={href} href={href} active={isActive(pathname, href)}>
              <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              {label}
            </NavLink>
          ))}
        </NavGroup>

        {/* Projects list */}
        <CollapsibleGroup
          label="Projects"
          open={projectsOpen}
          onToggle={() => setProjectsOpen(!projectsOpen)}
        >
          {sidebarProjects.map((p) => (
            <NavLink
              key={p.id}
              href={`/projects/${p.id}`}
              active={pathname === `/projects/${p.id}`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span className="truncate">{p.title}</span>
            </NavLink>
          ))}
        </CollapsibleGroup>

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
  if (href === "/projects") return pathname === "/projects";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-2 pt-6">
      <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-widest text-text-secondary/50 dark:text-zinc-500">
        {label}
      </p>
      <nav className="flex flex-col gap-0.5">{children}</nav>
    </div>
  );
}

function CollapsibleGroup({
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
  return (
    <div className="px-2 pt-6">
      <button
        type="button"
        onClick={onToggle}
        className="mb-1 flex w-full items-center gap-1 px-3 text-[10px] font-bold uppercase tracking-widest text-text-secondary/60 hover:text-text-secondary dark:text-zinc-500 dark:hover:text-zinc-400"
      >
        {label}
        <ChevronDown
          className={`ml-auto h-3 w-3 transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && <nav className="flex flex-col gap-0.5">{children}</nav>}
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
