"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function isInvoicesTab(pathname: string) {
  if (pathname === "/invoices") return true;
  if (pathname.startsWith("/invoices/new")) return true;
  if (pathname.startsWith("/invoices/agreements")) return false;
  return pathname.startsWith("/invoices/");
}

const links = [
  { href: "/invoices", label: "Invoices", match: isInvoicesTab },
  {
    href: "/invoices/agreements",
    label: "Agreements",
    match: (p: string) => p.startsWith("/invoices/agreements"),
  },
] as const;

export default function InvoiceSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 rounded-xl border border-border bg-surface/60 p-1 dark:border-zinc-800 dark:bg-zinc-900/50"
      aria-label="Invoices sections"
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
