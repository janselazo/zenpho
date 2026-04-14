"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Magnet, Wrench } from "lucide-react";

const TABS = [
  {
    href: "/prospecting/product-led/lead-magnets",
    label: "Lead Magnets",
    icon: Magnet,
  },
  {
    href: "/prospecting/product-led/tools",
    label: "Tools",
    icon: Wrench,
  },
] as const;

export default function ProductLedShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div>
      <div
        className="flex flex-wrap gap-1 border-b border-border dark:border-zinc-800/80"
        role="tablist"
        aria-label="Product-Led sections"
      >
        {TABS.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              role="tab"
              aria-selected={active}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                active
                  ? "text-accent dark:text-blue-400"
                  : "text-text-secondary hover:text-text-primary dark:text-zinc-500 dark:hover:text-zinc-200"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              {tab.label}
              {active ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent dark:bg-blue-400" />
              ) : null}
            </Link>
          );
        })}
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
