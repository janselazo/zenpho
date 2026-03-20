"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { navLinks, type NavLinkItem } from "@/lib/data";
import Button from "@/components/ui/Button";

function linkOrChildActive(pathname: string, item: NavLinkItem): boolean {
  if (pathname === item.href) return true;
  return item.children?.some((c) => pathname === c.href) ?? false;
}

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="fixed top-0 left-0 z-50 w-full px-4 pt-4 md:px-6 md:pt-5">
      <div
        className={`mx-auto max-w-7xl transition-all duration-300 ${
          scrolled ? "shadow-soft-lg" : "shadow-soft"
        }`}
      >
        <nav className="flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-3 py-2.5 shadow-soft backdrop-blur-xl md:gap-3 md:px-4 md:py-2">
          <Link href="/" className="group shrink-0 pl-1 md:pl-2">
            <span className="text-base font-bold tracking-tight text-text-primary">
              Janse Lazo
            </span>
          </Link>

          <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
            <ul className="flex items-center justify-center gap-5 xl:gap-6">
              {navLinks.map((link) =>
                link.children ? (
                  <li key={link.href} className="group relative shrink-0">
                    <Link
                      href={link.href}
                      className={`inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium transition-colors ${
                        linkOrChildActive(pathname, link)
                          ? "text-accent"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {link.label}
                      <svg
                        className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:rotate-180"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m19.5 8.25-7.5 7.5-7.5-7.5"
                        />
                      </svg>
                    </Link>
                    <div
                      className="invisible absolute left-1/2 top-full z-50 min-w-[11rem] -translate-x-1/2 pt-2 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
                      role="menu"
                      aria-label={`${link.label} menu`}
                    >
                      <ul className="rounded-xl border border-border bg-white py-2 shadow-soft-lg ring-1 ring-black/[0.04]">
                        {link.children.map((child) => (
                          <li key={child.href} role="none">
                            <Link
                              role="menuitem"
                              href={child.href}
                              className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                                pathname === child.href
                                  ? "bg-surface text-accent"
                                  : "text-text-secondary hover:bg-surface/80 hover:text-text-primary"
                              }`}
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ) : (
                  <li key={link.href} className="shrink-0">
                    <Link
                      href={link.href}
                      className={`block whitespace-nowrap text-sm font-medium transition-colors ${
                        pathname === link.href
                          ? "text-accent"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3">
            <Button href="/contact" variant="primary" size="sm" className="!px-5">
              Get started
            </Button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex flex-col gap-1.5 rounded-full p-2 lg:hidden"
              aria-label="Toggle menu"
            >
              <span
                className={`h-0.5 w-5 rounded-full bg-text-primary transition-all ${
                  mobileOpen ? "translate-y-[5px] rotate-45" : ""
                }`}
              />
              <span
                className={`h-0.5 w-5 rounded-full bg-text-primary transition-all ${
                  mobileOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`h-0.5 w-5 rounded-full bg-text-primary transition-all ${
                  mobileOpen ? "-translate-y-[5px] -rotate-45" : ""
                }`}
              />
            </button>
          </div>
        </nav>
      </div>

      <div
        className={`mx-auto mt-2 max-w-7xl overflow-hidden rounded-2xl border border-border bg-white shadow-soft transition-all lg:hidden ${
          mobileOpen ? "max-h-[32rem] opacity-100" : "max-h-0 border-0 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-0.5 p-3">
          {navLinks.map((link) =>
            link.children ? (
              <div key={link.href} className="flex flex-col gap-0.5">
                <Link
                  href={link.href}
                  className={`rounded-xl px-4 py-3 text-sm font-medium ${
                    pathname === link.href
                      ? "bg-surface text-accent"
                      : "text-text-secondary"
                  }`}
                >
                  {link.label}
                </Link>
                {link.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={`rounded-xl py-2.5 pl-8 pr-4 text-sm font-medium ${
                      pathname === child.href
                        ? "bg-surface text-accent"
                        : "text-text-secondary"
                    }`}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl px-4 py-3 text-sm font-medium ${
                  pathname === link.href
                    ? "bg-surface text-accent"
                    : "text-text-secondary"
                }`}
              >
                {link.label}
              </Link>
            ),
          )}
        </div>
      </div>
    </header>
  );
}
