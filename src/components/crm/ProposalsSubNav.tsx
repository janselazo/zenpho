"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function isProposalsTab(pathname: string) {
  if (pathname === "/proposals") return true;
  if (pathname.startsWith("/proposals/new")) return true;
  if (pathname.startsWith("/proposals/agreements")) return false;
  return pathname.startsWith("/proposals/");
}

const links = [
  { href: "/proposals", label: "Proposals", match: isProposalsTab },
  {
    href: "/proposals/agreements",
    label: "Agreements",
    match: (p: string) => p.startsWith("/proposals/agreements"),
  },
] as const;

export default function ProposalsSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 rounded-xl border border-border bg-surface/60 p-1 dark:border-zinc-800 dark:bg-zinc-900/50"
      aria-label="Proposals sections"
    >
      {links.map(({ href, label, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              active
                ? "bg-white text-text-primary shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                : "text-text-secondary hover:text-text-primary dark:text-zinc-500 dark:hover:text-zinc-200"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
